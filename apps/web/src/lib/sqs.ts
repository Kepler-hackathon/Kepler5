import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'us-east-1' })

/**
 * Enqueue a generation job for the worker Lambda to pick up.
 * If JOBS_QUEUE_URL is not set (local dev without SQS), logs a warning and skips — the job
 * row is still created in the DB, it just won't be processed until the env var is set.
 */
export async function enqueueJob(jobId: string): Promise<void> {
  const queueUrl = process.env.JOBS_QUEUE_URL
  if (!queueUrl) {
    console.warn('[sqs] JOBS_QUEUE_URL not set — job %s will not be picked up by the worker', jobId)
    return
  }
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ jobId }),
    }),
  )
}
