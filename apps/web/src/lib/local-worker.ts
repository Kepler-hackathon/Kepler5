import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { handleJob, startRun, wizardGenerate, finishRun } from 'kepler-generator/handler'

// Local (non-Lambda) invocation of the two workers, used when LOCAL_WORKERS=true. Mirrors
// the SQS consumer + "process-module" Step Functions state machine from
// infra/lib/constructs/jobs.ts, but runs everything as plain local calls/processes instead:
// generator runs in-process (getSql() already prefers DATABASE_URL over Secrets Manager, so
// it points at the local docker-compose Postgres); deck-parser shells out to a local Python
// venv via local_run.py. S3/Bedrock calls inside both still hit real AWS — set
// AI_DISABLED=true to skip the AI-touching steps if AWS creds aren't set up.

const deckParserDir = path.resolve(process.cwd(), '../../workers/deck-parser')
const deckParserPython = path.join(deckParserDir, '.venv/bin/python3')

function runDeckParserTask(event: Record<string, unknown>): Promise<unknown> {
  if (!fs.existsSync(deckParserPython)) {
    return Promise.reject(
      new Error(`deck-parser venv not found at ${deckParserPython} — run workers/deck-parser/scripts/setup-venv.sh`),
    )
  }
  return new Promise((resolve, reject) => {
    const child = execFile(
      deckParserPython,
      ['local_run.py'],
      { cwd: deckParserDir, env: process.env },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(`deck-parser ${event.task} failed: ${stderr || err.message}`))
        try {
          resolve(JSON.parse(stdout))
        } catch {
          reject(new Error(`deck-parser ${event.task} returned non-JSON output: ${stdout}`))
        }
      },
    )
    child.stdin?.end(JSON.stringify(event))
  })
}

export async function runLocalJob(jobId: string): Promise<void> {
  await handleJob({ jobId })
}

export async function runLocalProcessModule(input: {
  runId: string
  moduleId: string
  lectureIds?: string[] | null
  force?: boolean
}): Promise<void> {
  const { runId, moduleId } = input

  try {
    const { lectureIds, aiOptIn } = await startRun({
      runId,
      moduleId,
      onlyLectureIds: input.lectureIds,
      force: input.force,
    })

    for (const lectureId of lectureIds) {
      try {
        await runDeckParserTask({ task: 'parse', runId, moduleId, lectureId })
        if (aiOptIn) await wizardGenerate({ runId, moduleId, lectureId })
      } catch (err) {
        console.error(`[local-worker] lecture ${lectureId} failed:`, err)
      }
    }

    try {
      await runDeckParserTask({ task: 'ingestAnchors', runId, moduleId })
    } catch (err) {
      console.error('[local-worker] ingestAnchors failed:', err)
    }
  } finally {
    await finishRun({ runId })
  }
}
