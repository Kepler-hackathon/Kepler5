import { NextRequest, NextResponse } from 'next/server'
import { db, modules, lectures, generatedItems } from '@kepler/db'
import { eq, inArray, asc } from 'drizzle-orm'
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

  const [mod] = await db.select().from(modules).where(eq(modules.id, id))
  if (!mod) return apiError('not_found', 'Module not found', 404)

  const moduleLectures = await db
    .select()
    .from(lectures)
    .where(eq(lectures.moduleId, id))
    .orderBy(asc(lectures.orderIndex))

  if (moduleLectures.length === 0) {
    return NextResponse.json({ lectures: [] })
  }

  const lectureIds = moduleLectures.map((l) => l.id)

  const items = await db
    .select()
    .from(generatedItems)
    .where(inArray(generatedItems.lectureId, lectureIds))
    .orderBy(asc(generatedItems.createdAt))

  const itemsByLecture = new Map<string, typeof items>()
  for (const item of items) {
    const list = itemsByLecture.get(item.lectureId) ?? []
    list.push(item)
    itemsByLecture.set(item.lectureId, list)
  }

  return NextResponse.json({
    lectures: moduleLectures.map((lecture) => ({
      lectureId: lecture.id,
      title: lecture.title,
      items: (itemsByLecture.get(lecture.id) ?? []).map((item) => ({
        id: item.id,
        type: item.type,
        status: item.status,
        content: item.content,
        conceptLabel: item.conceptLabel,
        citations: item.citations,
        sourceSlideId: item.sourceSlideId,
        sourceSlideGone: item.sourceSlideId === null,
        createdAt: item.createdAt,
      })),
    })),
  })
}
