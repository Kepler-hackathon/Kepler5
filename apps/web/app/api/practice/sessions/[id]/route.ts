import { NextRequest, NextResponse } from 'next/server'
import { db, practiceSessions, quizQuestions } from '@kepler/db'
import { eq, inArray } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(
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

  let questions: unknown[] | undefined
  if (session.status === 'ready' || session.status === 'in_progress') {
    if (session.questionIds.length > 0) {
      const rawQuestions = await db
        .select()
        .from(quizQuestions)
        .where(inArray(quizQuestions.id, session.questionIds))

      // Sort by position in questionIds array
      const idxMap = new Map(session.questionIds.map((qid, i) => [qid, i]))
      questions = rawQuestions.sort((a, b) => (idxMap.get(a.id) ?? 0) - (idxMap.get(b.id) ?? 0))
    } else {
      questions = []
    }
  }

  return NextResponse.json({
    ...session,
    questions,
    currentQuestion: questions ? questions[session.currentIndex] ?? null : undefined,
  })
}
