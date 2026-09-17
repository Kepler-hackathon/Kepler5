import { NextRequest, NextResponse } from 'next/server'
import { db, modules } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id } = await params
  const [mod] = await db.select().from(modules).where(eq(modules.id, id))
  if (!mod) return apiError('not_found', 'Module not found', 404)
  if (identity.role === 'student' && mod.status !== 'published') {
    return apiError('not_found', 'Module not found', 404)
  }
  return NextResponse.json(mod)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { id } = await params
  const body = await req.json() as Record<string, unknown>
  const allowed = ['name', 'overviewMd', 'objectives', 'scheduleNotes', 'aiOptIn', 'itemsPerLecture']
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  const [updated] = await db
    .update(modules)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(modules.id, id))
    .returning()

  if (!updated) return apiError('not_found', 'Module not found', 404)
  return NextResponse.json(updated)
}
