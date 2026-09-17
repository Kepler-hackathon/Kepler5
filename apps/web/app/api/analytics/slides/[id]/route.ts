import { NextRequest, NextResponse } from 'next/server'
import { db, faqThreads, generationJobs } from '@kepler/db'
import { eq, and, sql } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { id } = await params

  // Wrong answer distribution for questions sourced from this slide
  const distRows = await db.execute(sql`
    SELECT le.question_id, le.option_key, COUNT(*)::int AS count
    FROM (
      SELECT DISTINCT ON (le2.user_id, le2.question_id)
        le2.user_id, le2.question_id, le2.option_key, le2.is_correct
      FROM learning_events le2
      INNER JOIN quiz_questions qq ON qq.id = le2.question_id
      WHERE le2.type = 'quiz_answer'
        AND qq.source_slide_id = ${id}::uuid
      ORDER BY le2.user_id, le2.question_id, le2.created_at ASC
    ) le
    WHERE le.is_correct = false
    GROUP BY le.question_id, le.option_key
    ORDER BY count DESC
  `)

  // FAQ titles tagged to this slide (up to 5, author stripped)
  const faqTitleRows = await db
    .select({ title: faqThreads.title })
    .from(faqThreads)
    .where(eq(faqThreads.tagSlideId, id))
    .limit(5)

  // Misconception cluster from a succeeded supplementary job
  const [clusterJob] = await db
    .select({ output: generationJobs.output })
    .from(generationJobs)
    .where(
      and(
        eq(generationJobs.type, 'supplementary'),
        eq(generationJobs.status, 'succeeded'),
        sql`${generationJobs.input}->>'slideId' = ${id}`,
      ),
    )
    .limit(1)

  const misconceptionCluster =
    clusterJob && clusterJob.output
      ? (clusterJob.output as Record<string, unknown>)['clusterLabel'] ?? null
      : null

  return NextResponse.json({
    slideId: id,
    wrongAnswerDistribution: distRows as unknown as Array<{ question_id: string; option_key: string; count: number }>,
    faqTitles: faqTitleRows.map((r) => r.title),
    misconceptionCluster,
  })
}
