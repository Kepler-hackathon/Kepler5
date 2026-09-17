import { NextRequest, NextResponse } from 'next/server'
import { db, studentProgress, learningEvents, slides, lectures } from '@kepler/db'
import { eq, and, sql } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ lectureId: string }> }) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { lectureId } = await params
  const body = await req.json() as { lastSlideId?: string; slideIndex?: number }

  if (!body.lastSlideId || body.slideIndex == null) {
    return apiError('bad_request', 'lastSlideId and slideIndex required', 400)
  }

  // Check if this is the last slide (for completed_at)
  const [lecture] = await db.select({ slideCount: lectures.slideCount }).from(lectures).where(eq(lectures.id, lectureId))
  const completedAt = lecture?.slideCount != null && body.slideIndex >= lecture.slideCount ? new Date() : null

  await db
    .insert(studentProgress)
    .values({
      userId: identity.userId,
      lectureId,
      lastSlideId: body.lastSlideId,
      maxSlideIndex: body.slideIndex,
      completedAt: completedAt ?? undefined,
    })
    .onConflictDoUpdate({
      target: [studentProgress.userId, studentProgress.lectureId],
      set: {
        lastSlideId: body.lastSlideId,
        // Use greatest() to only advance max_slide_index, never regress
        maxSlideIndex: sql`greatest(${studentProgress.maxSlideIndex}, ${body.slideIndex})`,
        ...(completedAt ? { completedAt } : {}),
        updatedAt: new Date(),
      },
    })

  // Record slide_view event
  await db.insert(learningEvents).values({
    userId: identity.userId,
    type: 'slide_view',
    lectureId,
    slideId: body.lastSlideId,
  })

  return NextResponse.json({ ok: true })
}
