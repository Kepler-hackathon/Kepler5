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
  const body = await req.json() as { teacherNote?: string }

  if (!body.teacherNote || body.teacherNote.trim() === '') {
    return apiError('bad_request', 'teacherNote is required', 400)
  }

  const [widget] = await db.select().from(peerWidgets).where(eq(peerWidgets.id, id))
  if (!widget) return apiError('not_found', 'Peer widget not found', 404)

  const [updated] = await db
    .update(peerWidgets)
    .set({ status: 'changes_requested', teacherNote: body.teacherNote })
    .where(eq(peerWidgets.id, id))
    .returning()

  return NextResponse.json(updated)
}
