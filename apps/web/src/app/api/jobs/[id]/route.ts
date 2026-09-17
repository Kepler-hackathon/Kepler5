import { NextRequest, NextResponse } from 'next/server'
import { db, generationJobs } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'
import { enqueueJob } from '@/lib/sqs'
import { checkJobBudget } from '@/lib/budget'

export const dynamic = 'force-dynamic'

const JOB_TYPES = [
  'remediation_widget',
  'remediation_text',
  'practice_quiz',
  'supplementary',
  'chat_title',
  'wizard_generate',
] as const
type JobType = (typeof JOB_TYPES)[number]

const TERMINAL_STATES = new Set(['succeeded', 'failed', 'cancelled'])

/**
 * POST /api/jobs/:type — create a new generation job.
 * Returns 202 {jobId, status:'queued'}, or 200 {status:'ready', result} on idempotency cache hit.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (process.env.AI_DISABLED === 'true') {
    return apiError('ai_disabled', 'AI features are currently disabled', 503)
  }

  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id: type } = await params
  if (!JOB_TYPES.includes(type as JobType)) {
    return apiError('bad_request', `Unknown job type: ${type}`, 400)
  }

  // Budget guard
  const withinBudget = await checkJobBudget(identity.userId)
  if (!withinBudget) {
    return apiError('rate_limited', 'Generation job budget exceeded (30 per hour)', 429, { retryable: true })
  }

  const idempotencyKey = req.headers.get('idempotency-key') ?? null
  const body = await req.json() as Record<string, unknown>

  // Idempotency: if we already have a job with this key, return it
  if (idempotencyKey) {
    const [existing] = await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.idempotencyKey, idempotencyKey))
    if (existing) {
      if (existing.status === 'succeeded') {
        return NextResponse.json({ status: 'ready', result: existing.output }, { status: 200 })
      }
      return NextResponse.json({ jobId: existing.id, status: existing.status }, { status: 200 })
    }
  }

  const [job] = await db
    .insert(generationJobs)
    .values({
      type: type as JobType,
      requestedBy: identity.userId,
      idempotencyKey,
      input: body,
      status: 'queued',
    })
    .returning()

  await enqueueJob(job!.id)

  return NextResponse.json({ jobId: job!.id, status: 'queued' }, { status: 202 })
}

/**
 * GET /api/jobs/:id — poll job status.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id } = await params
  const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, id))
  if (!job) return apiError('not_found', 'Job not found', 404)

  return NextResponse.json({
    jobId: job.id,
    type: job.type,
    status: job.status,
    ...(job.status === 'succeeded' ? { result: job.output } : {}),
    ...(job.status === 'failed'
      ? { error: job.error, errorCode: job.errorCode, retryAfterSeconds: 30 }
      : {}),
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  })
}
