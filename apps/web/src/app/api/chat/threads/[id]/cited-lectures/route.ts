import { NextRequest, NextResponse } from 'next/server'
import { db, chatThreads, chatMessages } from '@kepler/db'
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

  const [thread] = await db.select().from(chatThreads).where(eq(chatThreads.id, id))
  if (!thread) return apiError('not_found', 'Thread not found', 404)
  if (thread.userId !== identity.userId) {
    return apiError('forbidden', 'Access denied', 403)
  }

  const messages = await db
    .select({ parts: chatMessages.parts })
    .from(chatMessages)
    .where(eq(chatMessages.threadId, id))

  const lectureIds = new Set<string>()

  for (const msg of messages) {
    if (!Array.isArray(msg.parts)) continue
    for (const part of msg.parts as Array<Record<string, unknown>>) {
      if (part.type === 'cite' && typeof part.lectureId === 'string') {
        lectureIds.add(part.lectureId)
      }
    }
  }

  return NextResponse.json({ lectureIds: [...lectureIds] })
}
