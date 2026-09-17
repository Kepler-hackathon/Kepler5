import { NextRequest, NextResponse } from 'next/server'
import { db, quizQuestions, learningEvents } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id } = await params
  const body = await req.json() as { selectedKey: string }
  if (!body.selectedKey) return apiError('bad_request', 'selectedKey required', 400)

  const [question] = await db.select().from(quizQuestions).where(eq(quizQuestions.id, id))
  if (!question) return apiError('not_found', 'Question not found', 404)

  const isCorrect = question.correctKey === body.selectedKey

  const event: {
    userId: string
    type: 'quiz_answer'
    lectureId: string
    questionId: string
    optionKey: string
    isCorrect: boolean
    slideId?: string
  } = {
    userId: identity.userId,
    type: 'quiz_answer',
    lectureId: question.lectureId,
    questionId: id,
    optionKey: body.selectedKey,
    isCorrect,
  }
  if (question.sourceSlideId) event.slideId = question.sourceSlideId

  // Archived items still score but we don't record events for them (§14.5 #65, #66)
  // We don't have archived status on quiz_questions, so always record
  await db.insert(learningEvents).values(event)

  return NextResponse.json({
    isCorrect,
    correctKey: question.correctKey,
    explanationMd: question.explanationMd,
    conceptLabel: question.conceptLabel,
  })
}
