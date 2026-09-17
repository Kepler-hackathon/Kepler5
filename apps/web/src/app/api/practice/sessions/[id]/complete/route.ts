import { NextRequest, NextResponse } from 'next/server'
import { db, practiceSessions, practiceAnswers } from '@kepler/db'
import { eq, and, count } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id } = await params
  const [session] = await db.select().from(practiceSessions).where(eq(practiceSessions.id, id))
  if (!session) return apiError('not_found', 'Session not found', 404)

  if (session.userId !== identity.userId && identity.role !== 'teacher') {
    return apiError('forbidden', 'Access denied', 403)
  }

  if (session.status !== 'in_progress') {
    return apiError('invalid_status', `Session is ${session.status}, expected in_progress`, 409)
  }

  // Find already-answered question ids
  const answeredRows = await db
    .select({ questionId: practiceAnswers.questionId })
    .from(practiceAnswers)
    .where(eq(practiceAnswers.sessionId, id))
  const answeredSet = new Set(answeredRows.map((r) => r.questionId))

  // Mark remaining unanswered as skipped
  const unanswered = session.questionIds.filter((qid) => !answeredSet.has(qid))
  if (unanswered.length > 0) {
    await db.insert(practiceAnswers).values(
      unanswered.map((questionId) => ({ sessionId: id, questionId, skipped: true })),
    )
  }

  // Compute score
  const [scoreRow] = await db
    .select({ correct: count() })
    .from(practiceAnswers)
    .where(and(eq(practiceAnswers.sessionId, id), eq(practiceAnswers.isCorrect, true)))

  const scoreCorrect = Number(scoreRow?.correct ?? 0)
  const scoreTotal = session.questionIds.length

  await db
    .update(practiceSessions)
    .set({ status: 'completed', scoreCorrect, scoreTotal, completedAt: new Date() })
    .where(eq(practiceSessions.id, id))

  return NextResponse.json({
    scoreCorrect,
    scoreTotal,
    percentage: scoreTotal > 0 ? Math.round((scoreCorrect / scoreTotal) * 100) : 0,
  })
}
