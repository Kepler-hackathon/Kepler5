import { NextRequest, NextResponse } from 'next/server'
import { db, peerWidgets, generationJobs } from '@kepler/db'
import { eq, sql } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'
import { checkJobBudget } from '@/lib/budget'
import { enqueueJob } from '@/lib/sqs'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (process.env.AI_DISABLED === 'true') {
    return apiError('ai_disabled', 'AI features are currently disabled', 503)
  }

  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id } = await params
  const body = await req.json().catch(() => ({})) as { teacherNote?: string }

  const [widget] = await db.select().from(peerWidgets).where(eq(peerWidgets.id, id))
  if (!widget) return apiError('not_found', 'Peer widget not found', 404)

  if (widget.authorId !== identity.userId) {
    return apiError('forbidden', 'Only the widget author can regenerate', 403)
  }

  if (widget.status !== 'changes_requested') {
    return apiError('invalid_status', 'Widget must be in changes_requested status to regenerate', 409)
  }

  const withinBudget = await checkJobBudget(identity.userId)
  if (!withinBudget) {
    return apiError('rate_limited', 'Generation job budget exceeded (30 per hour)', 429, { retryable: true })
  }

  const [job] = await db
    .insert(generationJobs)
    .values({
      type: 'wizard_generate',
      requestedBy: identity.userId,
      input: { widgetId: id, content: widget.content, teacherNote: body.teacherNote ?? null },
      status: 'queued',
    })
    .returning()

  await enqueueJob(job!.id)

  const newVersion = widget.version + 1

  await db
    .update(peerWidgets)
    .set({ version: newVersion, status: 'in_review', teacherNote: null })
    .where(eq(peerWidgets.id, id))

  return NextResponse.json({ jobId: job!.id, version: newVersion })
}
