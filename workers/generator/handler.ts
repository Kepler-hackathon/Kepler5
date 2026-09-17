import type { Context, SQSEvent, SQSHandler } from 'aws-lambda';

/**
 * One Lambda, two entry paths (backend-plan.md §8):
 *
 *   1. SQS event   — on-demand generation jobs. Body: { jobId, type } where type ∈
 *                    remediation_widget | remediation_text | practice_quiz | supplementary | chat_title
 *   2. Direct invoke from the process-module state machine — { task, ... } where task ∈
 *                    startRun | wizardGenerate | finishRun
 *
 * This is the infrastructure scaffold: it validates the shapes the state machine and queue
 * send, logs them, and returns the contract the state machine expects. Build steps 3 and 6
 * (plan §17) add the Postgres + Bedrock work behind each branch.
 */

type SfnTask =
  | { task: 'startRun'; input: { runId: string; moduleId: string; onlyLectureIds?: string[] | null; force?: boolean } }
  | { task: 'wizardGenerate'; runId: string; moduleId: string; lectureId: string }
  | { task: 'finishRun'; input: Record<string, unknown> };

type JobMessage = { jobId: string; type: string };

const JOB_TYPES = new Set(['remediation_widget', 'remediation_text', 'practice_quiz', 'supplementary', 'chat_title']);

class NotImplemented extends Error {
  constructor(what: string) {
    super(`${what} is not implemented yet (see docs/backend-plan.md §17)`);
    this.name = 'NotImplemented';
  }
}

function isSqsEvent(event: unknown): event is SQSEvent {
  return typeof event === 'object' && event !== null && Array.isArray((event as SQSEvent).Records);
}

async function handleJob(message: JobMessage): Promise<void> {
  if (!JOB_TYPES.has(message.type)) throw new Error(`unknown job type: ${message.type}`);
  console.log(JSON.stringify({ msg: 'job received', jobId: message.jobId, type: message.type }));
  // TODO(build step 3): load generation_jobs row, guard status (§14.13 row 178), run the
  // Bedrock call via @ai-sdk/amazon-bedrock, validate with packages/contracts, write result.
  throw new NotImplemented(`job type ${message.type}`);
}

async function handleSfnTask(event: SfnTask): Promise<unknown> {
  switch (event.task) {
    case 'startRun': {
      const { runId, moduleId, onlyLectureIds, force } = event.input;
      console.log(JSON.stringify({ msg: 'startRun', runId, moduleId, onlyLectureIds, force }));
      // TODO(build step 5): create processing_runs + lecture_processing rows; skip lectures with
      // parse_status='parsed' unless force (§8.3 idempotency). Return ids only.
      return { lectureIds: [] as string[], aiOptIn: false };
    }
    case 'wizardGenerate': {
      console.log(JSON.stringify({ msg: 'wizardGenerate', runId: event.runId, lectureId: event.lectureId }));
      // TODO(build step 6): §9.2. Throw an error named 'ThrottlingException' on Bedrock throttles so
      // the state machine's retry policy matches it.
      throw new NotImplemented('wizardGenerate');
    }
    case 'finishRun': {
      console.log(JSON.stringify({ msg: 'finishRun', input: event.input }));
      // TODO(build step 5): compute module status = ready_to_review | needs_attention.
      return { ok: true };
    }
    default:
      throw new Error(`unknown task: ${(event as { task?: string }).task}`);
  }
}

export const handler = async (event: SQSEvent | SfnTask, context: Context): Promise<unknown> => {
  if (isSqsEvent(event)) {
    // batchSize is 1 (jobs.ts) so a throw here retries only this message; after 2 receives it lands in the DLQ.
    for (const record of event.Records) {
      await handleJob(JSON.parse(record.body) as JobMessage);
    }
    return;
  }
  return handleSfnTask(event);
};

// Type-only reference so the SQSHandler signature stays compatible if the export is narrowed later.
export type _SqsHandler = SQSHandler;
