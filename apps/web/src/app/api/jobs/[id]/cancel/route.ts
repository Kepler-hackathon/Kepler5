import { NextRequest, NextResponse } from 'next/server'
import { db, generationJobs } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

/**
 * POST /api/jobs/:id/cancel — mark a job as cancelled.
 * The worker (infra side) checks this flag before writing output.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id } = await params
  const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, id))
  if (!job) return apiError('not_found', 'Job not found', 404)

  if (['succeeded', 'failed', 'cancelled'].includes(job.status)) {
    return apiError('conflict', 'Job is already in a terminal state', 409)
  }

  await db
    .update(generationJobs)
    .set({ status: 'cancelled' })
    .where(eq(generationJobs.id, id))

  return NextResponse.json({ ok: true })
}
