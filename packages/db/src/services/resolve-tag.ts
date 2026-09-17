import { eq, and } from 'drizzle-orm'
import { db } from '../client'
import { modules, lectures, slides } from '../schema/tables'

export type TagLevel = 'module' | 'lecture' | 'slide'

export interface TagInput {
  tagModuleId: string
  tagLectureId?: string | null
  tagSlideId?: string | null
  tagLevel: TagLevel
}

export interface TagValidationError {
  code: string
  message: string
}

/**
 * Validates that the supplied tag path is internally consistent:
 * - lecture (if provided) must belong to the module
 * - slide (if provided) must belong to the lecture
 *
 * Returns null on success, or an error object on failure.
 */
export async function resolveTag(input: TagInput): Promise<TagValidationError | null> {
  const { tagModuleId, tagLectureId, tagSlideId, tagLevel } = input

  if (tagLevel === 'lecture' || tagLevel === 'slide') {
    if (!tagLectureId) {
      return { code: 'invalid_tag', message: 'tagLectureId required for lecture/slide level' }
    }
    const lecture = await db.query.lectures.findFirst({
      where: and(eq(lectures.id, tagLectureId), eq(lectures.moduleId, tagModuleId)),
      columns: { id: true },
    })
    if (!lecture) {
      return { code: 'invalid_tag', message: 'lecture does not belong to the specified module' }
    }
  }

  if (tagLevel === 'slide') {
    if (!tagSlideId || !tagLectureId) {
      return { code: 'invalid_tag', message: 'tagSlideId and tagLectureId required for slide level' }
    }
    const slide = await db.query.slides.findFirst({
      where: and(eq(slides.id, tagSlideId), eq(slides.lectureId, tagLectureId)),
      columns: { id: true },
    })
    if (!slide) {
      return { code: 'invalid_tag', message: 'slide does not belong to the specified lecture' }
    }
  }

  return null
}
