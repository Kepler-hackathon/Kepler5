import { NextRequest, NextResponse } from 'next/server'
import { db, processingRuns } from '@kepler/db'
import { eq, and, notInArray } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'
import { cancelProcessModule } from '@/lib/sfn'

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

  const [activeRun] = await db
    .select()
    .from(processingRuns)
    .where(
      and(
        eq(processingRuns.moduleId, id),
        notInArray(processingRuns.status, ['done', 'failed']),
      ),
    )
    .orderBy(processingRuns.startedAt)
    .limit(1)

  if (!activeRun) return apiError('no_active_run', 'No active processing run to cancel', 409)

  await db
    .update(processingRuns)
    .set({ cancelRequested: true })
    .where(eq(processingRuns.id, activeRun.id))

  await cancelProcessModule(activeRun.executionArn)

  return NextResponse.json({ cancelled: true })
}
