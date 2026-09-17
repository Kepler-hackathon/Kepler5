import { NextRequest } from 'next/server'
import { db, generationJobs } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

const TERMINAL_STATES = new Set(['succeeded', 'failed', 'cancelled'])
const POLL_INTERVAL_MS = 2_000
const HEARTBEAT_INTERVAL_MS = 10_000

/**
 * GET /api/jobs/:id/events — SSE stream for job status.
 * Sends status events every ~2s and a comment heartbeat every 10s.
 * Closes automatically on terminal state (succeeded / failed / cancelled).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id } = await params
  const [initial] = await db.select().from(generationJobs).where(eq(generationJobs.id, id))
  if (!initial) return apiError('not_found', 'Job not found', 404)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Already terminal — emit final state and close immediately
      if (TERMINAL_STATES.has(initial.status)) {
        send(buildPayload(initial))
        controller.close()
        return
      }

      let lastHeartbeat = Date.now()

      while (!req.signal.aborted) {
        const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, id))
        if (!job) break

        send(buildPayload(job))

        if (TERMINAL_STATES.has(job.status)) {
          controller.close()
          return
        }

        // Heartbeat comment to keep the connection alive through proxies
        if (Date.now() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
          lastHeartbeat = Date.now()
        }

        await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}

function buildPayload(job: { status: string; output: unknown; error: string | null; errorCode: string | null }) {
  if (job.status === 'succeeded') return { status: 'succeeded', result: job.output }
  if (job.status === 'failed') return { status: 'failed', error: job.error, errorCode: job.errorCode }
  return { status: job.status }
}
