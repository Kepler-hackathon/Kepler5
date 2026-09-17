import { NextRequest, NextResponse } from 'next/server'
import { SFNClient, StopExecutionCommand } from '@aws-sdk/client-sfn'
import { db, processingRuns } from '@kepler/db'
import { eq, and, notInArray } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

const sfn = new SFNClient({ region: process.env.AWS_REGION ?? 'us-east-1' })

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

  if (activeRun.executionArn) {
    try {
      await sfn.send(new StopExecutionCommand({ executionArn: activeRun.executionArn }))
    } catch (err: unknown) {
      const name = (err as { name?: string }).name
      if (name !== 'ExecutionDoesNotExist' && name !== 'ExecutionAlreadyFinished') {
        console.warn('[processing/cancel] StopExecution failed:', err)
      }
    }
  }

  return NextResponse.json({ cancelled: true })
}
