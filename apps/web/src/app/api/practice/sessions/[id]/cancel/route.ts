import { NextRequest, NextResponse } from 'next/server'
import { db, practiceSessions } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function POST(
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

  if (!['generating', 'ready', 'in_progress'].includes(session.status)) {
    return apiError('invalid_status', `Session cannot be cancelled (status: ${session.status})`, 409)
  }

  await db.update(practiceSessions).set({ status: 'cancelled' }).where(eq(practiceSessions.id, id))

  return NextResponse.json({ status: 'cancelled' })
}
