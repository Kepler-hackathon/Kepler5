import { NextRequest, NextResponse } from 'next/server'
import { db, peerWidgets, slides } from '@kepler/db'
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
  const [widget] = await db.select().from(peerWidgets).where(eq(peerWidgets.id, id))
  if (!widget) return apiError('not_found', 'Peer widget not found', 404)

  const lectureId = widget.tagLectureId
  if (!lectureId) {
    return NextResponse.json({ lectureId: null, slides: [] })
  }

  const lectureSlides = await db
    .select({
      id: slides.id,
      index: slides.index,
      isSupplementary: slides.isSupplementary,
      subIndex: slides.subIndex,
      afterSlideId: slides.afterSlideId,
    })
    .from(slides)
    .where(and(eq(slides.lectureId, lectureId), isNull(slides.deletedAt)))
    .orderBy(asc(slides.index), asc(slides.subIndex))

  return NextResponse.json({ lectureId, slides: lectureSlides })
}
