import { NextRequest, NextResponse } from 'next/server'
import { db, peerWidgets, peerWidgetUpvotes } from '@kepler/db'
import { eq, and, sql } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

const UPVOTE_THRESHOLD = Number(process.env.UPVOTE_THRESHOLD ?? '5')

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id } = await params

  const result = await db.transaction(async (tx) => {
    const [widget] = await tx.select().from(peerWidgets).where(eq(peerWidgets.id, id))
    if (!widget) return { error: 'not_found' }

    if (widget.authorId === identity.userId) return { error: 'self_upvote' }
    if (widget.status === 'archived') return { error: 'widget_archived' }

    const [existing] = await tx
      .select()
      .from(peerWidgetUpvotes)
      .where(and(eq(peerWidgetUpvotes.widgetId, id), eq(peerWidgetUpvotes.userId, identity.userId)))

    let upvoted: boolean
    let newCount: number

    if (existing) {
      await tx
        .delete(peerWidgetUpvotes)
        .where(and(eq(peerWidgetUpvotes.widgetId, id), eq(peerWidgetUpvotes.userId, identity.userId)))
      const [updated] = await tx
        .update(peerWidgets)
        .set({ upvoteCount: sql`${peerWidgets.upvoteCount} - 1` })
        .where(eq(peerWidgets.id, id))
        .returning({ upvoteCount: peerWidgets.upvoteCount, status: peerWidgets.status })
      upvoted = false
      newCount = updated!.upvoteCount
      return { upvoted, upvoteCount: newCount, status: updated!.status }
    } else {
      await tx.insert(peerWidgetUpvotes).values({ widgetId: id, userId: identity.userId })
      const newUpvoteCount = widget.upvoteCount + 1

      // Monotonic flip to in_review at threshold — never reverts
      const shouldFlip = newUpvoteCount >= UPVOTE_THRESHOLD && widget.status === 'collecting'
      const [updated] = await tx
        .update(peerWidgets)
        .set({
          upvoteCount: newUpvoteCount,
          ...(shouldFlip ? { status: 'in_review', enteredReviewAt: new Date() } : {}),
        })
        .where(eq(peerWidgets.id, id))
        .returning({ upvoteCount: peerWidgets.upvoteCount, status: peerWidgets.status })
      upvoted = true
      newCount = updated!.upvoteCount
      return { upvoted, upvoteCount: newCount, status: updated!.status }
    }
  })

  if ('error' in result) {
    if (result.error === 'not_found') return apiError('not_found', 'Peer widget not found', 404)
    if (result.error === 'self_upvote') return apiError('forbidden', 'Cannot upvote your own widget', 403)
    if (result.error === 'widget_archived') return apiError('widget_archived', 'Cannot upvote an archived widget', 409)
  }

  return NextResponse.json(result)
}
