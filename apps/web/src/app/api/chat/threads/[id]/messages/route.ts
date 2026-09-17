import { NextRequest, NextResponse } from 'next/server'
import { streamText, convertToCoreMessages } from 'ai'
import { z } from 'zod'
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
    maxSteps: 2,
    tools: {
      show_widget: {
        description:
          'Embed an interactive visual widget inline when a visual explanation helps more than text alone. Widget types: trace_stepper (step through code with call stack + variables), concept_slider (show how a value changes as N grows), predict_check (multiple-choice prediction quiz), big_o_chart (plot and compare Big-O complexity curves — ideal for complexity/algorithm questions), memory_diagram (show stack frames and heap objects — ideal for Java variable/reference type questions). Do NOT use for simple conceptual questions that plain text answers well.',
        parameters: z.object({
          type: z.enum(['trace_stepper', 'concept_slider', 'predict_check', 'big_o_chart', 'memory_diagram']),
          title: z.string().describe('Short title shown on the widget badge'),
          // --- trace_stepper ---
          code: z.array(z.string()).optional().describe('Source code lines, one element per line (trace_stepper only)'),
          steps: z
            .array(
              z.object({
                narration: z.string(),
                highlightLine: z.number().int().min(1),
                callStack: z.array(z.string()),
                variables: z.record(z.string()),
              }),
            )
            .optional()
            .describe('Ordered trace steps (trace_stepper only)'),
          // --- concept_slider ---
          description: z.string().optional().describe('One-sentence explanation of what the slider shows (concept_slider only)'),
          variable: z.string().optional().describe("The slider variable name, e.g. 'n' (concept_slider only)"),
          unit: z.string().optional().describe("Unit label shown after the value, e.g. 'elements' (concept_slider only)"),
          min: z.number().optional(),
          max: z.number().optional(),
          defaultValue: z.number().optional(),
          series: z
            .array(z.object({ label: z.string(), color: z.string().describe('CSS color string, e.g. #cc785c') }))
            .optional()
            .describe('Data series to plot (concept_slider only)'),
          seriesValues: z
            .array(z.array(z.number()))
            .optional()
            .describe(
              'Pre-computed values: seriesValues[seriesIndex][tickIndex] where tickIndex = (value - min). Length must equal (max - min + 1) for each series. (concept_slider only)',
            ),
          // --- predict_check ---
          scenario: z.string().optional().describe('The scenario/question the student must predict (predict_check only)'),
          options: z
            .array(z.object({ id: z.string(), label: z.string() }))
            .optional()
            .describe('Answer choices (predict_check only)'),
          correctId: z.string().optional().describe('id of the correct option (predict_check only)'),
          explanation: z.string().optional().describe('Explanation shown after checking (predict_check only)'),
          // --- big_o_chart ---
          complexities: z
            .array(z.object({
              fn: z.enum(['O(1)', 'O(log N)', 'O(N)', 'O(N log N)', 'O(N²)', 'O(2^N)']),
              color: z.string().describe('CSS color, e.g. #cc785c'),
              highlighted: z.boolean().optional().describe('Emphasise this curve (the one being discussed)'),
            }))
            .optional()
            .describe('Complexity curves to plot (big_o_chart only). Include 2–5 functions for contrast.'),
          maxN: z.number().int().min(5).max(50).optional().describe('Upper N bound for x-axis, default 20 (big_o_chart only)'),
          chartDescription: z.string().optional().describe('One-sentence context for the chart (big_o_chart only)'),
          // --- memory_diagram ---
          frames: z
            .array(z.object({
              label: z.string().describe("Frame name, e.g. 'main' or 'Stack Frame'"),
              variables: z.array(z.object({
                name: z.string(),
                type: z.string().describe("Java type, e.g. 'int', 'String', 'int[]'"),
                value: z.string().describe("Current value as string, e.g. '42', 'null', '0xA3'"),
                pointsTo: z.string().optional().describe('Name of a heapObjects entry this reference points to'),
              })),
            }))
            .optional()
            .describe('Stack frames showing local variables (memory_diagram only)'),
          heapObjects: z
            .array(z.object({
              name: z.string().describe('Identifier matching a pointsTo value in frames'),
              type: z.string(),
              value: z.string().describe('Contents, e.g. "[1, 2, 3]" or "Hello"'),
            }))
            .optional()
            .describe('Objects allocated on the heap (memory_diagram only)'),
          diagramDescription: z.string().optional().describe('One-sentence context for the diagram (memory_diagram only)'),
        }),
        // Without execute, the AI SDK's multi-step loop tries a second Bedrock call with an
        // undefined tool result, which hangs the stream. Returning a simple ack lets step 2
        // complete cleanly so the model can add any follow-up text.
        execute: async () => ({ rendered: true }),
      },
    },
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
