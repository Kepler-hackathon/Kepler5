import { NextRequest, NextResponse } from 'next/server'
import { db, faqThreads } from '@kepler/db'
import { eq, sql } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

const cache = new Map<string, { data: unknown; expiresAt: number }>()

function getCached(key: string) {
  const entry = cache.get(key)
  if (!entry || Date.now() > entry.expiresAt) return null
  return entry.data
}
function setCached(key: string, data: unknown) {
  cache.set(key, { data, expiresAt: Date.now() + 60_000 })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const fresh = searchParams.get('fresh') === '1'

  const cacheKey = `analytics:lecture:${id}`
  if (!fresh) {
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(cached)
  }

  // Top-level metrics
  const metricsRows = await db.execute(sql`
    SELECT
      COUNT(*)::int                                       AS attempt_count,
      AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END)    AS avg_score,
      COUNT(DISTINCT user_id)::int                        AS engaged_student_count
    FROM learning_events
    WHERE type = 'quiz_answer' AND lecture_id = ${id}::uuid
  `)

  const metrics = (metricsRows as unknown as Array<{ attempt_count: number; avg_score: number; engaged_student_count: number }>)[0]
  const attemptCount = metrics?.attempt_count ?? 0
  const avgScore = metrics ? Number(metrics.avg_score ?? 0) : 0
  const engagedStudentCount = metrics?.engaged_student_count ?? 0

  const faqCountRows = await db.execute(sql`
    SELECT COUNT(*)::int AS faq_count FROM faq_threads WHERE tag_lecture_id = ${id}::uuid
  `)
  const faqCount = ((faqCountRows as unknown as Array<{ faq_count: number }>)[0]?.faq_count) ?? 0

  // Wrong answer distribution — first attempt per (user_id, question_id), wrong answers only
  const distRows = await db.execute(sql`
    SELECT question_id, option_key, COUNT(*)::int AS count
    FROM (
      SELECT DISTINCT ON (user_id, question_id) user_id, question_id, option_key, is_correct
      FROM learning_events
      WHERE type = 'quiz_answer' AND lecture_id = ${id}::uuid
      ORDER BY user_id, question_id, created_at ASC
    ) first_attempts
    WHERE is_correct = false
    GROUP BY question_id, option_key
    ORDER BY count DESC
  `)

  // FAQ titles (up to 5, author stripped)
  const faqTitleRows = await db
    .select({ title: faqThreads.title })
    .from(faqThreads)
    .where(eq(faqThreads.tagLectureId, id))
    .limit(5)

  const insufficient = engagedStudentCount < 5
  const wrongRate = attemptCount > 0 ? 1 - avgScore : 0
  let cellState: 'noData' | 'red' | 'amber' | 'green' = 'noData'
  if (!insufficient && (attemptCount >= 5 || faqCount > 0)) {
    if (wrongRate >= 0.5) cellState = 'red'
    else if (wrongRate >= 0.25) cellState = 'amber'
    else cellState = 'green'
  }

  const result = {
    computedAt: new Date().toISOString(),
    lectureId: id,
    cellState,
    wrongRate,
    attemptCount,
    faqCount,
    engagedStudentCount,
    insufficient,
    wrongAnswerDistribution: distRows as unknown as Array<{ question_id: string; option_key: string; count: number }>,
    faqTitles: faqTitleRows.map((r) => r.title),
  }

  setCached(cacheKey, result)
  return NextResponse.json(result)
}
