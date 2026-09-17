import { NextRequest, NextResponse } from 'next/server'
import { streamText, convertToCoreMessages } from 'ai'
import { db, chatThreads, chatMessages, lectures, slides, modules, courses, generationJobs } from '@kepler/db'
import { eq, desc, asc, and } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'
import { checkChatBudget } from '@/lib/budget'
import { enqueueJob } from '@/lib/sqs'
import { bedrock } from '@/lib/bedrock'

export const dynamic = 'force-dynamic'

// No route previously existed to load a thread's message history (only POST to send a new
// one) — needed so the client can restore a saved conversation, e.g. via ai/react's
// useChat({ initialMessages }).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id } = await params
  const [thread] = await db.select().from(chatThreads).where(eq(chatThreads.id, id))
  if (!thread) return apiError('not_found', 'Thread not found', 404)
  if (thread.userId !== identity.userId) return apiError('forbidden', 'Access denied', 403)

  const history = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, id))
    .orderBy(asc(chatMessages.createdAt))

  return NextResponse.json(
    history.map((m) => ({
      id: m.id,
      role: m.role,
      content: Array.isArray(m.parts)
        ? (m.parts as Array<{ type: string; text?: string }>)
            .filter((p) => p.type === 'text')
            .map((p) => p.text ?? '')
            .join('')
        : '',
    })),
  )
}

async function buildSystemPrompt(scope: string, scopeId: string | null): Promise<string> {
  if (!scopeId) return 'You are a helpful AI learning assistant.'

  try {
    if (scope === 'slide') {
      const [slide] = await db.select().from(slides).where(eq(slides.id, scopeId))
      if (slide) {
        return `You are a helpful AI learning assistant. Focus on the following slide content:\n\n<slide_content>\n${slide.text}\n</slide_content>`
      }
    } else if (scope === 'lecture') {
      const lectureSlides = await db
        .select()
        .from(slides)
        .where(and(eq(slides.lectureId, scopeId)))
        .orderBy(asc(slides.index))
      const allText = lectureSlides.map((s, i) => `Slide ${i + 1}:\n${s.text}`).join('\n\n')
      return `You are a helpful AI learning assistant. Focus on the following lecture content:\n\n<lecture_content>\n${allText}\n</lecture_content>`
    } else if (scope === 'module') {
      const [mod] = await db.select().from(modules).where(eq(modules.id, scopeId))
      if (mod) {
        return `You are a helpful AI learning assistant. Focus on the following module: "${mod.name}"${mod.overviewMd ? `\n\nOverview:\n${mod.overviewMd}` : ''}`
      }
    } else if (scope === 'course') {
      const [course] = await db.select().from(courses).where(eq(courses.id, scopeId))
      if (course) {
        return `You are a helpful AI learning assistant for the course: "${course.name}".`
      }
    }
  } catch {
    // Fall through to default
  }

  return 'You are a helpful AI learning assistant.'
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (process.env.AI_DISABLED === 'true') {
    return apiError('ai_disabled', 'AI features are currently disabled', 503)
  }

  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const withinBudget = await checkChatBudget(identity.userId)
  if (!withinBudget) {
    return apiError('rate_limited', 'Chat message budget exceeded (200 per day)', 429, { retryable: true })
  }

  const { id } = await params

  const [thread] = await db.select().from(chatThreads).where(eq(chatThreads.id, id))
  if (!thread) return apiError('not_found', 'Thread not found', 404)
  if (thread.userId !== identity.userId) {
    return apiError('forbidden', 'Access denied', 403)
  }
  if (thread.pendingToolCallId) {
    return apiError('tool_call_pending', 'Resolve pending tool call before sending another message', 409)
  }

  const body = await req.json() as { messages?: Array<{ role: string; content: string; id?: string }> }
  const incomingMessages = body.messages ?? []
  const lastUserMsg = [...incomingMessages].reverse().find((m) => m.role === 'user')
  const userText = typeof lastUserMsg?.content === 'string'
    ? lastUserMsg.content
    : ''

  if (userText.length > 4000) {
    return apiError('message_too_long', 'Message exceeds 4000 character limit', 400)
  }

  // Persist user message
  await db.insert(chatMessages).values({
    threadId: id,
    role: 'user',
    parts: [{ type: 'text', text: userText }],
    scope: thread.scope,
    scopeId: thread.scopeId,
    status: 'complete',
  })

  // Update lastMessageAt
  await db.update(chatThreads).set({ lastMessageAt: new Date() }).where(eq(chatThreads.id, id))

  // Load history (last 30 messages)
  const history = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, id))
    .orderBy(desc(chatMessages.createdAt))
    .limit(30)
  history.reverse()

  // Build core messages from history
  const coreMessages = convertToCoreMessages(
    history.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: Array.isArray(m.parts)
        ? (m.parts as Array<{ type: string; text?: string }>)
            .filter((p) => p.type === 'text')
            .map((p) => p.text ?? '')
            .join('')
        : '',
    })),
  )

  const systemPrompt = await buildSystemPrompt(thread.scope, thread.scopeId ?? null)
  const isFirstAssistantReply = !history.some((m) => m.role === 'assistant')

  const result = streamText({
    model: bedrock(process.env.BEDROCK_MODEL_MAIN ?? 'us.anthropic.claude-sonnet-5-20251001-v1:0'),
    system: systemPrompt,
    messages: coreMessages,
    onFinish: async ({ text, usage }) => {
      await db.insert(chatMessages).values({
        threadId: id,
        role: 'assistant',
        parts: [{ type: 'text', text }],
        scope: thread.scope,
        scopeId: thread.scopeId,
        status: 'complete',
        usage: usage as unknown as Record<string, unknown>,
      })

      // Enqueue title generation on first reply
      if (isFirstAssistantReply && !thread.title) {
        const [job] = await db
          .insert(generationJobs)
          .values({
            type: 'chat_title',
            requestedBy: identity.userId,
            input: { threadId: id, firstUserMessage: userText },
            status: 'queued',
          })
          .returning()
        await enqueueJob(job!.id)
      }
    },
  })

  return result.toDataStreamResponse({
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
