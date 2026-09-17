import { NextRequest, NextResponse } from 'next/server'
import { db, lectures, slides, lectureItems, generatedItems } from '@kepler/db'
import { eq, and, isNull, asc, inArray } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

const KIND_ORDER: Record<string, number> = {
  supplementary_slide: 0,
  quiz: 1,
  widget: 2,
  peer_widget: 3,
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id } = await params

  const [lecture] = await db.select().from(lectures).where(eq(lectures.id, id))
  if (!lecture) return apiError('not_found', 'Lecture not found', 404)

  // ETag check
  const etag = `"${lecture.bundleVersion}"`
  const ifNoneMatch = req.headers.get('if-none-match')
  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } })
  }

  // Load slides (non-deleted)
  const slideRows = await db
    .select()
    .from(slides)
    .where(and(eq(slides.lectureId, id), isNull(slides.deletedAt)))
    .orderBy(asc(slides.index), asc(slides.subIndex))

  // Strip notes for students
  const isTeacher = identity.role === 'teacher'
  const slideData = slideRows.map((s) => ({
    id: s.id,
    index: s.index,
    subIndex: s.subIndex,
    isSupplementary: s.isSupplementary,
    afterSlideId: s.afterSlideId,
    imageKey: s.imageKey,
    thumbKey: s.thumbKey,
    width: s.width,
    height: s.height,
    text: s.text,
    content: s.content,
    ...(isTeacher ? { notes: s.notes } : {}),
  }))

  // Load active lecture items
  const rawItemRows = await db
    .select()
    .from(lectureItems)
    .where(and(eq(lectureItems.lectureId, id), eq(lectureItems.status, 'active')))

  // lecture_items only stores a refId — quiz/widget content lives in generated_items
  // (publish/route.ts always writes refId as generatedItems.id, regardless of kind).
  // Resolve it here so the bundle is actually usable by the client without another round trip.
  const refIds = rawItemRows.map((r) => r.refId)
  const contentRows = refIds.length
    ? await db.select().from(generatedItems).where(inArray(generatedItems.id, refIds))
    : []
  const contentById = new Map(contentRows.map((c) => [c.id, c]))

  const itemRows = rawItemRows.map((item) => {
    const generated = contentById.get(item.refId)
    return {
      ...item,
      content: generated?.content ?? null,
      conceptLabel: generated?.conceptLabel ?? null,
    }
  })

  // Sort: group by afterSlideId, then by kind order, then orderInSlot
  itemRows.sort((a, b) => {
    if (a.afterSlideId !== b.afterSlideId) {
      return (a.afterSlideId ?? '').localeCompare(b.afterSlideId ?? '')
    }
    const kindDiff = (KIND_ORDER[a.kind] ?? 99) - (KIND_ORDER[b.kind] ?? 99)
    if (kindDiff !== 0) return kindDiff
    return a.orderInSlot - b.orderInSlot
  })

  return NextResponse.json(
    { version: lecture.bundleVersion, slides: slideData, items: itemRows },
    { headers: { ETag: etag } },
  )
}
