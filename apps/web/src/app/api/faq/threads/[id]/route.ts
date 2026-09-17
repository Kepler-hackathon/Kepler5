import { NextRequest, NextResponse } from 'next/server'
import { db, faqThreads, faqReplies } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id } = await params
  const [thread] = await db.select().from(faqThreads).where(eq(faqThreads.id, id))
  if (!thread) return apiError('not_found', 'Thread not found', 404)

  const replies = await db
    .select()
    .from(faqReplies)
    .where(eq(faqReplies.threadId, id))
    .orderBy(faqReplies.createdAt)

  return NextResponse.json({ ...thread, replies })
}
