import { NextRequest, NextResponse } from 'next/server'
import { db, supplementaryDrafts, slides, lectures, lectureItems } from '@kepler/db'
import { eq, sql } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { draftId } = await params
  const body = await req.json() as { afterSlideId?: string }
  const { afterSlideId } = body

  if (!afterSlideId) return apiError('bad_request', 'afterSlideId is required', 400)

  const [draft] = await db.select().from(supplementaryDrafts).where(eq(supplementaryDrafts.id, draftId))
  if (!draft) return apiError('not_found', 'Draft not found', 404)
  if (draft.status === 'merged') return apiError('already_merged', 'Draft has already been merged', 409)
  if (!draft.slideContent) return apiError('not_ready', 'Draft content not yet generated', 409)

  // Find afterSlide to get lectureId
  const [afterSlide] = await db.select({ lectureId: slides.lectureId }).from(slides).where(eq(slides.id, afterSlideId))
  if (!afterSlide) return apiError('not_found', 'afterSlide not found', 404)
  const { lectureId } = afterSlide

  const result = await db.transaction(async (tx) => {
    // Compute subIndex
    const subIndexRows = await tx.execute(sql`
      SELECT COALESCE(MAX(sub_index), 0) + 1 AS next_sub_index
      FROM slides
      WHERE after_slide_id = ${afterSlideId}::uuid
        AND is_supplementary = true
        AND deleted_at IS NULL
    `)
    const subIndex = Number((subIndexRows as unknown as Array<{ next_sub_index: number }>)[0]?.next_sub_index ?? 1)

    // Insert supplementary slide
    const [newSlide] = await tx
      .insert(slides)
      .values({
        lectureId,
        afterSlideId,
        subIndex,
        isSupplementary: true,
        text: '',
        content: draft.slideContent,
      })
      .returning()

    // Insert supplementary_slide lectureItem
    await tx.insert(lectureItems).values({
      lectureId,
      afterSlideId,
      kind: 'supplementary_slide',
      refId: newSlide!.id,
      orderInSlot: 0,
      status: 'active',
    })

    // If widget content, insert widget lectureItem
    if (draft.widgetContent) {
      await tx.insert(lectureItems).values({
        lectureId,
        afterSlideId,
        kind: 'widget',
        refId: newSlide!.id,
        orderInSlot: 1,
        status: 'active',
      })
    }

    // Bump bundleVersion
    await tx
      .update(lectures)
      .set({ bundleVersion: sql`${lectures.bundleVersion} + 1` })
      .where(eq(lectures.id, lectureId))

    // Mark draft merged
    await tx
      .update(supplementaryDrafts)
      .set({ status: 'merged', mergedSlideId: newSlide!.id, mergedAt: new Date() })
      .where(eq(supplementaryDrafts.id, draftId))

    return newSlide!.id
  })

  return NextResponse.json({ status: 'merged', slideId: result })
}
