import { NextRequest, NextResponse } from 'next/server'
import { db, peerWidgets, lectureItems, lectures, slides } from '@kepler/db'
import { eq, sql } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

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
  const body = await req.json() as { afterSlideId?: string; expectedStatus?: string }

  if (!body.afterSlideId) {
    return apiError('bad_request', 'afterSlideId is required', 400)
  }

  const [widget] = await db.select().from(peerWidgets).where(eq(peerWidgets.id, id))
  if (!widget) return apiError('not_found', 'Peer widget not found', 404)

  if (body.expectedStatus && widget.status !== body.expectedStatus) {
    return apiError('status_mismatch', `Expected status '${body.expectedStatus}' but got '${widget.status}'`, 409)
  }

  if (widget.status !== 'in_review') {
    return apiError('invalid_status', 'Widget must be in in_review status to approve', 409)
  }

  // Determine lectureId from widget tag or from the afterSlide
  let lectureId = widget.tagLectureId
  if (!lectureId) {
    const [slide] = await db.select({ lectureId: slides.lectureId }).from(slides).where(eq(slides.id, body.afterSlideId))
    if (!slide) return apiError('not_found', 'afterSlide not found', 404)
    lectureId = slide.lectureId
  }

  const { lectureItemId } = await db.transaction(async (tx) => {
    const [slotRow] = await tx.execute(
      sql`SELECT COALESCE(MAX(order_in_slot), -1) + 1 AS next_slot
          FROM lecture_items
          WHERE lecture_id = ${lectureId}
            AND after_slide_id = ${body.afterSlideId!}
            AND status = 'active'`,
    )
    const orderInSlot = Number((slotRow as { next_slot: number }).next_slot ?? 0)

    const [newItem] = await tx
      .insert(lectureItems)
      .values({
        lectureId: lectureId!,
        afterSlideId: body.afterSlideId!,
        kind: 'peer_widget',
        refId: id,
        orderInSlot,
        status: 'active',
      })
      .returning()

    await tx
      .update(peerWidgets)
      .set({
        status: 'merged',
        lectureItemId: newItem!.id,
        reviewedBy: identity.userId,
        reviewedAt: new Date(),
      })
      .where(eq(peerWidgets.id, id))

    await tx
      .update(lectures)
      .set({ bundleVersion: sql`${lectures.bundleVersion} + 1` })
      .where(eq(lectures.id, lectureId!))

    return { lectureItemId: newItem!.id }
  })

  return NextResponse.json({ status: 'merged', lectureItemId })
}
