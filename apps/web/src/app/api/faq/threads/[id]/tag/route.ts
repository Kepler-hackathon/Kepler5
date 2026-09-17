import { NextRequest, NextResponse } from 'next/server'
import { db, faqThreads, slides } from '@kepler/db'
import { resolveTag } from '@kepler/db'
import { eq, and } from 'drizzle-orm'
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
  const [thread] = await db.select().from(faqThreads).where(eq(faqThreads.id, id))
  if (!thread) return apiError('not_found', 'Thread not found', 404)

  const body = await req.json() as {
    tagModuleId?: string
    tagLectureId?: string | null
    tagSlideId?: string | null
    suggestedSlideIndex?: number
  }

  const { tagModuleId, tagLectureId, tagSlideId, suggestedSlideIndex } = body
  if (!tagModuleId) return apiError('bad_request', 'tagModuleId is required', 400)

  const tagLevel = tagSlideId ? 'slide' : tagLectureId ? 'lecture' : 'module'
  const tagError = await resolveTag({ tagModuleId, tagLectureId, tagSlideId, tagLevel })
  if (tagError) return apiError('invalid_tag', tagError.message, 400)

  let resolvedSlideId = tagSlideId ?? null
  if (suggestedSlideIndex !== undefined && tagLectureId && !tagSlideId) {
    const [found] = await db
      .select({ id: slides.id })
      .from(slides)
      .where(and(eq(slides.lectureId, tagLectureId), eq(slides.index, suggestedSlideIndex)))
      .limit(1)
    if (found) resolvedSlideId = found.id
  }

  const newTagLevel = resolvedSlideId ? 'slide' : tagLectureId ? 'lecture' : 'module'

  const [updated] = await db
    .update(faqThreads)
    .set({
      tagModuleId,
      tagLectureId: tagLectureId ?? null,
      tagSlideId: resolvedSlideId,
      tagLevel: newTagLevel,
      updatedAt: new Date(),
    })
    .where(eq(faqThreads.id, id))
    .returning()

  return NextResponse.json(updated)
}
