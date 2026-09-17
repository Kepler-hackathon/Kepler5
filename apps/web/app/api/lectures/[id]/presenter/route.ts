import { NextRequest, NextResponse } from 'next/server'
import { db, lectures, slides } from '@kepler/db'
import { eq, and, isNull, asc } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { id } = await params

  const [lecture] = await db.select().from(lectures).where(eq(lectures.id, id))
  if (!lecture) return apiError('not_found', 'Lecture not found', 404)

  const slideRows = await db
    .select()
    .from(slides)
    .where(and(eq(slides.lectureId, id), isNull(slides.deletedAt), eq(slides.isSupplementary, false)))
    .orderBy(asc(slides.index))

  return NextResponse.json({ slides: slideRows })
}
