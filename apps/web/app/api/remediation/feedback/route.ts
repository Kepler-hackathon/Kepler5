import { NextRequest, NextResponse } from 'next/server'
import { db, remediationFeedback, remediationCache } from '@kepler/db'
import { eq, and, count, sql } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

/**
 * POST /api/remediation/feedback
 *
 * Upserts a per-user feedback row and recomputes the aggregate helpful / not_helpful
 * counters on the remediation_cache row.
 */
export async function POST(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const body = await req.json() as {
    questionId?: string
    questionVersion?: number
    optionKey?: string
    kind?: string
    variant?: number
    helpful?: boolean
    note?: string
  }

  const { questionId, questionVersion, optionKey, kind, helpful, note } = body
  const variant = body.variant ?? 1

  if (!questionId || questionVersion == null || !optionKey || !kind || helpful == null) {
    return apiError(
      'bad_request',
      'questionId, questionVersion, optionKey, kind, and helpful are required',
      400,
    )
  }
  if (kind !== 'widget' && kind !== 'text') {
    return apiError('bad_request', "kind must be 'widget' or 'text'", 400)
  }

  // Upsert the user's feedback (change of mind is allowed)
  await db
    .insert(remediationFeedback)
    .values({
      userId: identity.userId,
      questionId,
      questionVersion,
      optionKey,
      kind: kind as 'widget' | 'text',
      variant,
      helpful,
      note: note ?? null,
    })
    .onConflictDoUpdate({
      target: [
        remediationFeedback.userId,
        remediationFeedback.questionId,
        remediationFeedback.questionVersion,
        remediationFeedback.optionKey,
        remediationFeedback.kind,
        remediationFeedback.variant,
      ],
      set: { helpful, note: note ?? null },
    })

  // Recompute aggregate counters from scratch (handles vote changes correctly)
  const [helpfulRow] = await db
    .select({ count: count() })
    .from(remediationFeedback)
    .where(
      and(
        eq(remediationFeedback.questionId, questionId),
        eq(remediationFeedback.questionVersion, questionVersion),
        eq(remediationFeedback.optionKey, optionKey),
        eq(remediationFeedback.kind, kind as 'widget' | 'text'),
        eq(remediationFeedback.variant, variant),
        eq(remediationFeedback.helpful, true),
      ),
    )
  const [notHelpfulRow] = await db
    .select({ count: count() })
    .from(remediationFeedback)
    .where(
      and(
        eq(remediationFeedback.questionId, questionId),
        eq(remediationFeedback.questionVersion, questionVersion),
        eq(remediationFeedback.optionKey, optionKey),
        eq(remediationFeedback.kind, kind as 'widget' | 'text'),
        eq(remediationFeedback.variant, variant),
        eq(remediationFeedback.helpful, false),
      ),
    )

  await db
    .update(remediationCache)
    .set({
      helpful: Number(helpfulRow?.count ?? 0),
      notHelpful: Number(notHelpfulRow?.count ?? 0),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(remediationCache.questionId, questionId),
        eq(remediationCache.questionVersion, questionVersion),
        eq(remediationCache.optionKey, optionKey),
        eq(remediationCache.kind, kind as 'widget' | 'text'),
        eq(remediationCache.variant, variant),
      ),
    )

  return NextResponse.json({ ok: true })
}
