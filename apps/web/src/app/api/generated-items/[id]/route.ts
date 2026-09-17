import { NextRequest, NextResponse } from 'next/server'
import { db, generatedItems } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { id } = await params
  const body = await req.json() as { status?: string }
  const { status } = body

  if (status !== 'approved' && status !== 'discarded') {
    return apiError('bad_request', "status must be 'approved' or 'discarded'", 400)
  }

  const [item] = await db.select().from(generatedItems).where(eq(generatedItems.id, id))
  if (!item) return apiError('not_found', 'Generated item not found', 404)

  if (item.status === 'published' || item.status === 'archived') {
    return apiError('item_locked', 'Cannot modify a published or archived item', 409)
  }

  const [updated] = await db
    .update(generatedItems)
    .set({ status: status as 'approved' | 'discarded' })
    .where(eq(generatedItems.id, id))
    .returning()

  return NextResponse.json(updated)
}
