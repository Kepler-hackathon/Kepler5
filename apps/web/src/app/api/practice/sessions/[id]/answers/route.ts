import { NextRequest, NextResponse } from 'next/server'
import { db, practiceSessions, practiceAnswers, quizQuestions } from '@kepler/db'
import { eq, and } from 'drizzle-orm'
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

  if (session.status !== 'ready' && session.status !== 'in_progress') {
    return apiError('invalid_status', `Session is ${session.status}`, 409)
  }

  const body = await req.json() as { questionId?: string; selectedKey?: string; skipped?: boolean }
  const { questionId, selectedKey, skipped } = body

  if (!questionId) return apiError('bad_request', 'questionId is required', 400)

  // Validate ordering
  const expectedId = session.questionIds[session.currentIndex]
  if (expectedId !== questionId) {
    return apiError('out_of_order', 'questionId does not match the current question', 409)
  }

  // Check for duplicate
  const [existing] = await db
    .select()
    .from(practiceAnswers)
    .where(and(eq(practiceAnswers.sessionId, id), eq(practiceAnswers.questionId, questionId)))
  if (existing) {
    return apiError('already_answered', 'This question has already been answered', 409)
  }

  // Flip to in_progress on first answer
  if (session.status === 'ready') {
    await db.update(practiceSessions).set({ status: 'in_progress' }).where(eq(practiceSessions.id, id))
  }

  if (skipped) {
    await db.insert(practiceAnswers).values({ sessionId: id, questionId, skipped: true })
    await db
      .update(practiceSessions)
      .set({ currentIndex: session.currentIndex + 1 })
      .where(eq(practiceSessions.id, id))
    return NextResponse.json({ skipped: true })
  }

  if (!selectedKey) return apiError('bad_request', 'selectedKey is required when not skipping', 400)

  const [question] = await db.select().from(quizQuestions).where(eq(quizQuestions.id, questionId))
  if (!question) return apiError('not_found', 'Question not found', 404)

  const isCorrect = selectedKey === question.correctKey

  await db.insert(practiceAnswers).values({ sessionId: id, questionId, selectedKey, isCorrect })
  await db
    .update(practiceSessions)
    .set({ currentIndex: session.currentIndex + 1 })
    .where(eq(practiceSessions.id, id))

  return NextResponse.json({
    isCorrect,
    correctKey: question.correctKey,
    explanation: question.explanationMd,
  })
}
