import { NextRequest, NextResponse } from 'next/server'
import { db, lectures, modules, faqThreads, learningEvents } from '@kepler/db'
import { eq, and, inArray, sql } from 'drizzle-orm'
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

export async function GET(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { searchParams } = new URL(req.url)
  const moduleId = searchParams.get('moduleId')
  const fresh = searchParams.get('fresh') === '1'

  const cacheKey = `analytics:lectures:${moduleId ?? 'all'}`
  if (!fresh) {
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(cached)
  }

  // Get relevant lectures
  let lectureRows: Array<{ id: string; title: string; moduleId: string }>
  if (moduleId) {
    lectureRows = await db
      .select({ id: lectures.id, title: lectures.title, moduleId: lectures.moduleId })
      .from(lectures)
      .where(eq(lectures.moduleId, moduleId))
      .orderBy(lectures.orderIndex)
  } else {
    // All lectures in published modules
    const publishedModules = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.status, 'published'))
    const moduleIds = publishedModules.map((m) => m.id)
    if (moduleIds.length === 0) {
      const result = { computedAt: new Date().toISOString(), lectures: [] }
      setCached(cacheKey, result)
      return NextResponse.json(result)
    }
    lectureRows = await db
      .select({ id: lectures.id, title: lectures.title, moduleId: lectures.moduleId })
      .from(lectures)
      .where(inArray(lectures.moduleId, moduleIds))
      .orderBy(lectures.orderIndex)
  }

  if (lectureRows.length === 0) {
    const result = { computedAt: new Date().toISOString(), lectures: [] }
    setCached(cacheKey, result)
    return NextResponse.json(result)
  }

  const lectureIds = lectureRows.map((l) => l.id)

  // Bulk analytics query
  const analyticsRows = await db.execute(sql`
    SELECT
      le.lecture_id,
      COUNT(*)::int                                       AS attempt_count,
      AVG(CASE WHEN le.is_correct THEN 1.0 ELSE 0.0 END) AS avg_score,
      COUNT(DISTINCT le.user_id)::int                     AS engaged_student_count
    FROM learning_events le
    WHERE le.type = 'quiz_answer'
      AND le.lecture_id = ANY(${sql.raw(`ARRAY[${lectureIds.map((id) => `'${id}'`).join(',')}]::uuid[]`)})
    GROUP BY le.lecture_id
  `)

  const faqRows = await db.execute(sql`
    SELECT tag_lecture_id, COUNT(*)::int AS faq_count
    FROM faq_threads
    WHERE tag_lecture_id = ANY(${sql.raw(`ARRAY[${lectureIds.map((id) => `'${id}'`).join(',')}]::uuid[]`)})
    GROUP BY tag_lecture_id
  `)

  type AnalyticsRow = { lecture_id: string; attempt_count: number; avg_score: number; engaged_student_count: number }
  type FaqRow = { tag_lecture_id: string; faq_count: number }

  const analyticsMap = new Map<string, AnalyticsRow>(
    (analyticsRows as unknown as AnalyticsRow[]).map((r) => [r.lecture_id, r])
  )
  const faqMap = new Map<string, number>(
    (faqRows as unknown as FaqRow[]).map((r) => [r.tag_lecture_id, r.faq_count])
  )

  const computedAt = new Date().toISOString()

  const result = {
    computedAt,
    lectures: lectureRows.map((l) => {
      const a = analyticsMap.get(l.id)
      const attemptCount = a?.attempt_count ?? 0
      const avgScore = a ? Number(a.avg_score) : 0
      const engagedStudentCount = a?.engaged_student_count ?? 0
      const faqCount = faqMap.get(l.id) ?? 0
      const insufficient = engagedStudentCount < 5
      let cellState: 'noData' | 'red' | 'amber' | 'green' = 'noData'
      let wrongRate = 0
      if (!insufficient && (attemptCount >= 5 || faqCount > 0)) {
        wrongRate = 1 - avgScore
        if (wrongRate >= 0.5) cellState = 'red'
        else if (wrongRate >= 0.25) cellState = 'amber'
        else cellState = 'green'
      }
      return {
        lectureId: l.id,
        title: l.title,
        cellState,
        wrongRate,
        attemptCount,
        faqCount,
        engagedStudentCount,
        insufficient,
      }
    }),
  }

  setCached(cacheKey, result)
  return NextResponse.json(result)
}
