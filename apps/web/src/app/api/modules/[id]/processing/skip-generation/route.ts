import { NextRequest, NextResponse } from 'next/server'
import { db, processingRuns, lectureProcessing } from '@kepler/db'
import { eq, and, inArray } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

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
  const body = await req.json() as { lectureId?: string }
  if (!body.lectureId) return apiError('bad_request', 'lectureId is required', 400)

  const [activeRun] = await db
    .select()
    .from(processingRuns)
    .where(
      and(
        eq(processingRuns.moduleId, id),
        inArray(processingRuns.status, ['pending', 'running']),
      ),
    )
    .orderBy(processingRuns.startedAt)
    .limit(1)

  if (!activeRun) return apiError('not_found', 'No active processing run found', 404)

  const [row] = await db
    .select()
    .from(lectureProcessing)
    .where(
      and(
        eq(lectureProcessing.runId, activeRun.id),
        eq(lectureProcessing.lectureId, body.lectureId),
      ),
    )

  if (!row) return apiError('not_found', 'Lecture not found in current processing run', 404)

  await db
    .update(lectureProcessing)
    .set({ genStatus: 'skipped' })
    .where(
      and(
        eq(lectureProcessing.runId, activeRun.id),
        eq(lectureProcessing.lectureId, body.lectureId),
      ),
    )

  return NextResponse.json({ skipped: true })
}
