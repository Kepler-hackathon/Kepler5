import { NextRequest, NextResponse } from 'next/server'
import { db, modules, lectures, slides } from '@kepler/db'
import { eq, and, asc, isNull } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const url = new URL(req.url)
  const moduleId = url.searchParams.get('moduleId')
  if (!moduleId) return apiError('bad_request', 'moduleId is required', 400)

  const [mod] = await db
    .select({ id: modules.id, name: modules.name })
    .from(modules)
    .where(eq(modules.id, moduleId))
  if (!mod) return apiError('not_found', 'Module not found', 404)

  const moduleLectures = await db
    .select({ id: lectures.id, title: lectures.title })
    .from(lectures)
    .where(eq(lectures.moduleId, moduleId))
    .orderBy(asc(lectures.orderIndex))

  const lectureIds = moduleLectures.map((l) => l.id)

  const allSlides = lectureIds.length > 0
    ? await db
        .select({ id: slides.id, lectureId: slides.lectureId, index: slides.index })
        .from(slides)
        .where(
          and(
            eq(slides.isSupplementary, false),
            isNull(slides.deletedAt),
          ),
        )
        .orderBy(asc(slides.index))
    : []

  const slidesByLecture = new Map<string, { id: string; index: number }[]>()
  for (const slide of allSlides) {
    if (!lectureIds.includes(slide.lectureId)) continue
    const arr = slidesByLecture.get(slide.lectureId) ?? []
    arr.push({ id: slide.id, index: slide.index! })
    slidesByLecture.set(slide.lectureId, arr)
  }

  return NextResponse.json({
    module: { id: mod.id, name: mod.name },
    lectures: moduleLectures.map((l) => ({
      id: l.id,
      title: l.title,
      slides: slidesByLecture.get(l.id) ?? [],
    })),
  })
}
