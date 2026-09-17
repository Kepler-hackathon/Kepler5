import { NextRequest, NextResponse } from 'next/server'
import { db, peerWidgets } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id } = await params
  const [widget] = await db.select().from(peerWidgets).where(eq(peerWidgets.id, id))
  if (!widget) return apiError('not_found', 'Peer widget not found', 404)

  return NextResponse.json(widget)
}
