import { NextRequest, NextResponse } from 'next/server'
import { db, faqThreads, faqReplies } from '@kepler/db'
import { eq, sql } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const text = await req.text()
  if (text.length > 20480) return apiError('body_too_large', 'Body exceeds 20 KB limit', 413)

  const { id } = await params
  const [thread] = await db.select({ id: faqThreads.id }).from(faqThreads).where(eq(faqThreads.id, id))
  if (!thread) return apiError('not_found', 'Thread not found', 404)

  const body = JSON.parse(text) as { bodyMd?: string }
  if (!body.bodyMd) return apiError('bad_request', 'bodyMd is required', 400)

  const [reply] = await db
    .insert(faqReplies)
    .values({
      threadId: id,
      authorId: identity.userId,
      bodyMd: body.bodyMd,
      isInstructor: identity.role === 'teacher',
    })
    .returning()

  await db
    .update(faqThreads)
    .set({ replyCount: sql`${faqThreads.replyCount} + 1`, updatedAt: new Date() })
    .where(eq(faqThreads.id, id))

  return NextResponse.json(reply, { status: 201 })
}
