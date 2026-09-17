import { NextRequest, NextResponse } from 'next/server'
import { db, faqThreads, faqUpvotes } from '@kepler/db'
import { eq, and, sql } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id } = await params
  const [thread] = await db.select({ id: faqThreads.id, upvoteCount: faqThreads.upvoteCount })
    .from(faqThreads)
    .where(eq(faqThreads.id, id))
  if (!thread) return apiError('not_found', 'Thread not found', 404)

  const [existing] = await db
    .select()
    .from(faqUpvotes)
    .where(and(eq(faqUpvotes.threadId, id), eq(faqUpvotes.userId, identity.userId)))

  if (existing) {
    await db.delete(faqUpvotes).where(
      and(eq(faqUpvotes.threadId, id), eq(faqUpvotes.userId, identity.userId)),
    )
    const [updated] = await db
      .update(faqThreads)
      .set({ upvoteCount: sql`${faqThreads.upvoteCount} - 1` })
      .where(eq(faqThreads.id, id))
      .returning({ upvoteCount: faqThreads.upvoteCount })
    return NextResponse.json({ upvoted: false, upvoteCount: updated?.upvoteCount ?? 0 })
  }

  await db.insert(faqUpvotes).values({ threadId: id, userId: identity.userId })
  const [updated] = await db
    .update(faqThreads)
    .set({ upvoteCount: sql`${faqThreads.upvoteCount} + 1` })
    .where(eq(faqThreads.id, id))
    .returning({ upvoteCount: faqThreads.upvoteCount })
  return NextResponse.json({ upvoted: true, upvoteCount: updated?.upvoteCount ?? 0 })
}
