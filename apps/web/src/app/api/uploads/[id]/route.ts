import { NextRequest, NextResponse } from 'next/server'
import { db, files } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { id } = await params
  const [file] = await db.select().from(files).where(eq(files.id, id))
  if (!file) return apiError('not_found', 'Upload not found', 404)
  if (file.status === 'deleted') return apiError('conflict', 'Upload already deleted', 409)

  await db.update(files).set({ status: 'deleted' }).where(eq(files.id, id))
  return new NextResponse(null, { status: 204 })
}
