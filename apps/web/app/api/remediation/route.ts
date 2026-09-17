import { NextRequest, NextResponse } from 'next/server'
import { db, quizQuestions, remediationCache, generationJobs } from '@kepler/db'
import { eq, and } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'
import { enqueueJob } from '@/lib/sqs'
import { checkJobBudget } from '@/lib/budget'

export const dynamic = 'force-dynamic'

/**
 * POST /api/remediation { questionId, optionKey, kind }
 *
 * Class-wide single-flight: uses INSERT … ON CONFLICT DO NOTHING to ensure only
 * one generation ever runs per (question, version, option, kind, variant=1).
 * - Inserted → we own it; create job and enqueue.
 * - Conflict  → branch on existing status (generating | ready | failed).
 */
export async function POST(req: NextRequest) {
  if (process.env.AI_DISABLED === 'true') {
    return apiError('ai_disabled', 'AI features are currently disabled', 503)
  }

  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const body = await req.json() as { questionId?: string; optionKey?: string; kind?: string }
  const { questionId, optionKey, kind } = body

  if (!questionId || !optionKey || !kind) {
    return apiError('bad_request', 'questionId, optionKey, and kind are required', 400)
  }
  if (kind !== 'widget' && kind !== 'text') {
    return apiError('bad_request', "kind must be 'widget' or 'text'", 400)
  }

  const [question] = await db.select().from(quizQuestions).where(eq(quizQuestions.id, questionId))
  if (!question) return apiError('not_found', 'Question not found', 404)

  // Remediation is only meaningful for wrong answers
  if (question.correctKey === optionKey) {
    return apiError('bad_request', 'Remediation is only available for incorrect answer options', 400)
  }

  const questionVersion = question.version

  // Budget check before claiming ownership
  const withinBudget = await checkJobBudget(identity.userId)
  if (!withinBudget) {
    return apiError('rate_limited', 'Generation job budget exceeded (30 per hour)', 429, { retryable: true })
  }

  // Attempt to claim ownership via single-flight insert
  const inserted = await db
    .insert(remediationCache)
    .values({
      questionId,
      questionVersion,
      optionKey,
      kind: kind as 'widget' | 'text',
      variant: 1,
      status: 'generating',
    })
    .onConflictDoNothing()
    .returning()

  if (inserted.length > 0) {
    // We own the generation — create the job row and enqueue
    const jobType = kind === 'widget' ? 'remediation_widget' : ('remediation_text' as const)
    const [job] = await db
      .insert(generationJobs)
      .values({
        type: jobType,
        requestedBy: identity.userId,
        input: { questionId, questionVersion, optionKey, kind, variant: 1 },
        status: 'queued',
      })
      .returning()

    // Link job to cache row
    await db
      .update(remediationCache)
      .set({ jobId: job!.id })
      .where(
        and(
          eq(remediationCache.questionId, questionId),
          eq(remediationCache.questionVersion, questionVersion),
          eq(remediationCache.optionKey, optionKey),
          eq(remediationCache.kind, kind as 'widget' | 'text'),
          eq(remediationCache.variant, 1),
        ),
      )

    await enqueueJob(job!.id)

    return NextResponse.json({ status: 'generating', jobId: job!.id }, { status: 202 })
  }

  // Conflict — row already exists; read and branch on its status
  const [existing] = await db
    .select()
    .from(remediationCache)
    .where(
      and(
        eq(remediationCache.questionId, questionId),
        eq(remediationCache.questionVersion, questionVersion),
        eq(remediationCache.optionKey, optionKey),
        eq(remediationCache.kind, kind as 'widget' | 'text'),
        eq(remediationCache.variant, 1),
      ),
    )

  if (!existing) return apiError('internal', 'Unexpected cache miss after conflict', 500)

  if (existing.status === 'ready') {
    return NextResponse.json({
      status: 'ready',
      content: existing.content,
      citations: existing.citations,
      helpful: existing.helpful,
      notHelpful: existing.notHelpful,
    })
  }

  if (existing.status === 'generating') {
    return NextResponse.json({ status: 'generating', jobId: existing.jobId }, { status: 202 })
  }

  // failed
  return NextResponse.json({ status: 'failed', error: existing.error })
}
