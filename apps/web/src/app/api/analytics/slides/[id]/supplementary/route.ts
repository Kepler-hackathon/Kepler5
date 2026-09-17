import { NextRequest, NextResponse } from 'next/server'
import { db, slides, generationJobs, supplementaryDrafts } from '@kepler/db'
import { eq, and } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'
import { enqueueJob } from '@/lib/sqs'
import { checkJobBudget } from '@/lib/budget'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (process.env.AI_DISABLED === 'true') {
    return apiError('ai_disabled', 'AI features are currently disabled', 503)
  }

  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { id } = await params
  const body = await req.json() as { moduleId?: string }
  const { moduleId } = body

  if (!moduleId) return apiError('bad_request', 'moduleId is required', 400)

  const [slide] = await db.select().from(slides).where(eq(slides.id, id))
  if (!slide) return apiError('not_found', 'Slide not found', 404)

  // Idempotency: existing draft
  const [existingDraft] = await db
    .select()
    .from(supplementaryDrafts)
    .where(and(eq(supplementaryDrafts.slideId, id), eq(supplementaryDrafts.status, 'draft')))
    .limit(1)

  if (existingDraft) {
    return NextResponse.json({ draftId: existingDraft.id, jobId: existingDraft.jobId }, { status: 202 })
  }

  const withinBudget = await checkJobBudget(identity.userId)
  if (!withinBudget) {
    return apiError('rate_limited', 'Generation job budget exceeded (30 per hour)', 429, { retryable: true })
  }

  const [job] = await db
    .insert(generationJobs)
    .values({
      type: 'supplementary',
      requestedBy: identity.userId,
      input: { slideId: id, moduleId },
      status: 'queued',
    })
    .returning()

  await enqueueJob(job!.id)

  const [draft] = await db
    .insert(supplementaryDrafts)
    .values({
      slideId: id,
      jobId: job!.id,
      createdBy: identity.userId,
      status: 'draft',
    })
    .returning()

  return NextResponse.json({ draftId: draft!.id, jobId: job!.id }, { status: 202 })
}
