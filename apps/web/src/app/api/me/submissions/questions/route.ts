import { NextRequest, NextResponse } from 'next/server'
import { db, learningEvents, quizQuestions } from '@kepler/db'
import { eq, and, sql } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  // Distinct questions answered by this user, with the question details
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (le.question_id)
      le.question_id,
      le.is_correct,
      le.created_at AS answered_at,
      qq.prompt_md,
      qq.correct_key,
      qq.concept_label,
      qq.lecture_id
    FROM learning_events le
    INNER JOIN quiz_questions qq ON qq.id = le.question_id
    WHERE le.type = 'quiz_answer'
      AND le.user_id = ${identity.userId}::uuid
    ORDER BY le.question_id, le.created_at DESC
  `)

  return NextResponse.json(rows)
}
