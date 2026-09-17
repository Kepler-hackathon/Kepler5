import { NextRequest, NextResponse } from 'next/server'
import { db, peerWidgets } from '@kepler/db'
import { eq } from 'drizzle-orm'
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
  const body = await req.json().catch(() => ({})) as { reason?: string }

  const [widget] = await db.select().from(peerWidgets).where(eq(peerWidgets.id, id))
  if (!widget) return apiError('not_found', 'Peer widget not found', 404)

  await db
    .update(peerWidgets)
    .set({
      status: 'archived',
      archiveReason: body.reason ?? null,
      reviewedBy: identity.userId,
      reviewedAt: new Date(),
    })
    .where(eq(peerWidgets.id, id))

  return NextResponse.json({ status: 'archived' })
}
