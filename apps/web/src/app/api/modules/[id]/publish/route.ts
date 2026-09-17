import { NextRequest, NextResponse } from 'next/server'
import { db, modules, lectures, generatedItems, lectureItems, slides } from '@kepler/db'
import { eq, and, inArray, asc, isNull, sql } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'
import { readJsonBody } from '@/lib/body'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { id } = await params
  const parsed = await readJsonBody<{ excludeLectureIds?: string[] }>(req)
  if ('error' in parsed) return parsed.error
  const excludeLectureIds = parsed.data.excludeLectureIds ?? []

  const [mod] = await db.select().from(modules).where(eq(modules.id, id))
  if (!mod) return apiError('not_found', 'Module not found', 404)

  // Idempotent — already published
  if (mod.status === 'published') {
    return NextResponse.json({ status: 'published', publishedAt: mod.publishedAt })
  }

  const allLectures = await db
    .select()
    .from(lectures)
    .where(eq(lectures.moduleId, id))
    .orderBy(asc(lectures.orderIndex))

  const activeLectures = allLectures.filter((l) => !excludeLectureIds.includes(l.id))

  if (activeLectures.length === 0) {
    return apiError('no_ready_lectures', 'No lectures available to publish', 409)
  }

  const unparsedLectureIds = activeLectures
    .filter((l) => l.parseStatus !== 'parsed')
    .map((l) => l.id)

  if (unparsedLectureIds.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: 'lectures_not_ready',
          message: 'All lectures must be fully parsed before publishing',
          retryable: false,
          details: { unparsedLectureIds },
        },
      },
      { status: 409 },
    )
  }

  const publishedAt = new Date()

  await db.transaction(async (tx) => {
    for (const lecture of activeLectures) {
      const approvedItems = await tx
        .select()
        .from(generatedItems)
        .where(
          and(
            eq(generatedItems.lectureId, lecture.id),
            eq(generatedItems.status, 'approved'),
          ),
        )
        .orderBy(asc(generatedItems.createdAt))

      // Find the first slide of this lecture as fallback afterSlideId
      const [firstSlide] = await tx
        .select({ id: slides.id })
        .from(slides)
        .where(
          and(
            eq(slides.lectureId, lecture.id),
            isNull(slides.deletedAt),
            isNull(slides.afterSlideId), // original slides only
          ),
        )
        .orderBy(asc(slides.index))
        .limit(1)

      let publishedCount = 0

      for (const item of approvedItems) {
        const afterSlideId = item.sourceSlideId ?? firstSlide?.id ?? null
        if (!afterSlideId) continue

        // Compute next orderInSlot inside the transaction
        const [slotRow] = await tx.execute(
          sql`SELECT COALESCE(MAX(order_in_slot), -1) + 1 AS next_slot
              FROM lecture_items
              WHERE lecture_id = ${lecture.id}
                AND after_slide_id = ${afterSlideId}
                AND status = 'active'`,
        )
        const orderInSlot = Number((slotRow as { next_slot: number }).next_slot ?? 0)

        await tx.insert(lectureItems).values({
          lectureId: lecture.id,
          afterSlideId,
          kind: item.type === 'quiz' ? 'quiz' : 'widget',
          refId: item.id,
          orderInSlot,
          status: 'active',
        })

        await tx
          .update(generatedItems)
          .set({ status: 'published' })
          .where(eq(generatedItems.id, item.id))

        publishedCount++
      }

      // Bump bundleVersion once per lecture if any items were published
      if (publishedCount > 0) {
        await tx
          .update(lectures)
          .set({ bundleVersion: sql`${lectures.bundleVersion} + 1` })
          .where(eq(lectures.id, lecture.id))
      }
    }

    // Set module orderIndex = MAX(order_index across published modules in same course) + 1
    await tx.execute(
      sql`UPDATE modules SET order_index = (
            SELECT COALESCE(MAX(order_index), 0) + 1
            FROM modules
            WHERE course_id = ${mod.courseId} AND status = 'published'
          ),
          status = 'published',
          published_at = ${publishedAt.toISOString()},
          updated_at = NOW()
          WHERE id = ${id}`,
    )
  })

  return NextResponse.json({ status: 'published', publishedAt })
}
