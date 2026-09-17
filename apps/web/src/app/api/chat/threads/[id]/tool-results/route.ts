import { NextRequest, NextResponse } from 'next/server'
import { db, chatThreads, chatMessages } from '@kepler/db'
import { eq } from 'drizzle-orm'
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

  const [thread] = await db.select().from(chatThreads).where(eq(chatThreads.id, id))
  if (!thread) return apiError('not_found', 'Thread not found', 404)
  if (thread.userId !== identity.userId) {
    return apiError('forbidden', 'Access denied', 403)
  }

  const body = await req.json() as { toolCallId?: string; output?: unknown }
  const { toolCallId, output } = body

  if (!toolCallId) return apiError('bad_request', 'toolCallId is required', 400)

  // Persist tool result message
  await db.insert(chatMessages).values({
    threadId: id,
    role: 'tool',
    parts: [{ type: 'tool-result', toolCallId, result: output }],
    status: 'complete',
  })

  // Clear pending tool call
  await db
    .update(chatThreads)
    .set({ pendingToolCallId: null })
    .where(eq(chatThreads.id, id))

  return NextResponse.json({ ok: true })
}
