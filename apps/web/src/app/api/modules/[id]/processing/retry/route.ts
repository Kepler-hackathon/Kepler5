import { NextRequest, NextResponse } from 'next/server'
import { db, modules, lectures, processingRuns, lectureProcessing } from '@kepler/db'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'
import { retryProcessModule } from '@/lib/sfn'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { id } = await params
  const body = await req.json() as { lectureIds?: string[]; force?: boolean }

  const [running] = await db
    .select()
    .from(processingRuns)
    .where(and(eq(processingRuns.moduleId, id), eq(processingRuns.status, 'running')))
    .limit(1)

  if (running) return apiError('already_processing', 'A processing run is already in progress', 409)

  // Determine which lectures to include
  let targetLectures = await db
    .select()
    .from(lectures)
    .where(
      body.lectureIds?.length
        ? and(eq(lectures.moduleId, id), inArray(lectures.id, body.lectureIds))
        : eq(lectures.moduleId, id),
    )
    .orderBy(lectures.orderIndex)

  if (targetLectures.length === 0) {
    return apiError('bad_request', 'No lectures found for retry', 400)
  }

  // Unless force=true, skip already-parsed lectures
  if (!body.force) {
    const [lastRun] = await db
      .select()
      .from(processingRuns)
      .where(eq(processingRuns.moduleId, id))
      .orderBy(desc(processingRuns.startedAt))
      .limit(1)

    if (lastRun) {
      const parsedRows = await db
        .select()
        .from(lectureProcessing)
        .where(
          and(
            eq(lectureProcessing.runId, lastRun.id),
            eq(lectureProcessing.parseStatus, 'done'),
          ),
        )
      const parsedIds = new Set(parsedRows.map((r) => r.lectureId))
      targetLectures = targetLectures.filter((l) => !parsedIds.has(l.id))
    }

    if (targetLectures.length === 0) {
      return apiError('bad_request', 'No lectures need reprocessing (use force=true to override)', 400)
    }
  }

  const runId = await db.transaction(async (tx) => {
    const [run] = await tx
      .insert(processingRuns)
      .values({
        moduleId: id,
        status: 'pending',
        onlyLectureIds: targetLectures.map((l) => l.id),
      })
      .returning()

    await tx.insert(lectureProcessing).values(
      targetLectures.map((l) => ({
        runId: run!.id,
        lectureId: l.id,
        parseStatus: 'pending' as const,
        genStatus: 'pending' as const,
      })),
    )

    await tx.update(modules).set({ status: 'processing' }).where(eq(modules.id, id))
    return run!.id
  })

  await retryProcessModule({
    runId,
    moduleId: id,
    lectureIds: targetLectures.map((l) => l.id),
    // targetLectures above is already the definitive, correctly-filtered set (it accounts for
    // body.force itself) — force:true here tells generator's startRun() not to re-filter by
    // lectures.parse_status and silently drop lectures we've already decided to reprocess.
    force: true,
  })

  return NextResponse.json({ runId, status: 'running' }, { status: 202 })
}
