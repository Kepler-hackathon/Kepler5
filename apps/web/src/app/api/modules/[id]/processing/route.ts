import { NextRequest, NextResponse } from 'next/server'
import { db, processingRuns, lectureProcessing } from '@kepler/db'
import { eq, desc } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

const TERMINAL_RUN_STATES = new Set(['done', 'failed', 'skipped'])
const POLL_INTERVAL_MS = 2_000
const HEARTBEAT_INTERVAL_MS = 10_000

async function fetchStatus(moduleId: string) {
  const [run] = await db
    .select()
    .from(processingRuns)
    .where(eq(processingRuns.moduleId, moduleId))
    .orderBy(desc(processingRuns.startedAt))
    .limit(1)

  if (!run) return null

  const lectures = await db
    .select()
    .from(lectureProcessing)
    .where(eq(lectureProcessing.runId, run.id))

  return {
    runId: run.id,
    status: run.status,
    cancelRequested: run.cancelRequested,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    error: run.error,
    lectures: lectures.map((lp) => ({
      lectureId: lp.lectureId,
      parseStatus: lp.parseStatus,
      genStatus: lp.genStatus,
      parseAttempts: lp.parseAttempts,
      genAttempts: lp.genAttempts,
      itemsGenerated: lp.itemsGenerated,
      parseError: lp.parseError,
      genError: lp.genError,
    })),
  }
}

function isTerminal(payload: Awaited<ReturnType<typeof fetchStatus>>) {
  if (!payload) return false
  if (TERMINAL_RUN_STATES.has(payload.status)) return true
  return payload.lectures.every((l) =>
    TERMINAL_RUN_STATES.has(l.parseStatus) && TERMINAL_RUN_STATES.has(l.genStatus),
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { id } = await params
  const wantSSE =
    req.headers.get('accept') === 'text/event-stream' ||
    req.nextUrl.searchParams.get('stream') === 'true'

  if (!wantSSE) {
    const payload = await fetchStatus(id)
    if (!payload) return apiError('not_found', 'No processing run found for this module', 404)
    return NextResponse.json(payload)
  }

  // SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      let lastHeartbeat = Date.now()

      while (!req.signal.aborted) {
        const payload = await fetchStatus(id)
        if (payload) send(payload)

        if (isTerminal(payload)) {
          controller.close()
          return
        }

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
