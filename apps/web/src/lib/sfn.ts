import { SFNClient, StartExecutionCommand, StopExecutionCommand } from '@aws-sdk/client-sfn'
import { db, processingRuns } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { runLocalProcessModule } from './local-worker'

const sfn = new SFNClient({ region: process.env.AWS_REGION ?? 'us-east-1' })

/**
 * Starts the "process-module" workflow for a run. When LOCAL_WORKERS=true, runs it locally
 * (see local-worker.ts) instead of starting a real Step Functions execution — no Lambda
 * involved. Otherwise behaves exactly as before: starts the execution if
 * PROCESS_MODULE_STATE_MACHINE_ARN is set, or just marks the run 'running' if not.
 */
export async function startProcessModule(input: {
  runId: string
  moduleId: string
  lectureIds: string[]
}): Promise<void> {
  const { runId, moduleId, lectureIds } = input

  if (process.env.LOCAL_WORKERS === 'true') {
    await db.update(processingRuns).set({ status: 'running' }).where(eq(processingRuns.id, runId))
    runLocalProcessModule({ runId, moduleId, lectureIds }).catch((err) =>
      console.error(`[local-worker] process-module run ${runId} failed:`, err),
    )
    return
  }

  const stateMachineArn = process.env.PROCESS_MODULE_STATE_MACHINE_ARN
  if (!stateMachineArn) {
    console.warn('[sfn] PROCESS_MODULE_STATE_MACHINE_ARN not set — run %s will not be processed', runId)
    await db.update(processingRuns).set({ status: 'running' }).where(eq(processingRuns.id, runId))
    return
  }

  try {
    const result = await sfn.send(
      new StartExecutionCommand({
        stateMachineArn,
        name: runId,
        input: JSON.stringify({ runId, moduleId, lectureIds }),
      }),
    )
    await db
      .update(processingRuns)
      .set({ status: 'running', executionArn: result.executionArn })
      .where(eq(processingRuns.id, runId))
  } catch (err) {
    console.error(`[sfn] Failed to start execution for run ${runId}:`, err)
  }
}

/** Same as startProcessModule, used by the retry route (identical local/AWS branching). */
export const retryProcessModule = startProcessModule

/**
 * Cancels an in-flight run. Locally there's no execution to stop — cancel_requested is
 * already checked mid-run by generator's startRun/wizardGenerate — so this is a no-op there.
 */
export async function cancelProcessModule(executionArn: string | null): Promise<void> {
  if (process.env.LOCAL_WORKERS === 'true' || !executionArn) return

  try {
    await sfn.send(new StopExecutionCommand({ executionArn }))
  } catch (err: unknown) {
    const name = (err as { name?: string }).name
    if (name !== 'ExecutionDoesNotExist' && name !== 'ExecutionAlreadyFinished') {
      console.warn('[sfn] StopExecution failed:', err)
    }
  }
}
