import { NextRequest, NextResponse } from 'next/server'
import { db, practiceSessions, generationJobs, lectures, modules } from '@kepler/db'
import { eq, and, inArray, gte, desc } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'
import { enqueueJob } from '@/lib/sqs'
import { checkJobBudget } from '@/lib/budget'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const idempotencyKey = req.headers.get('idempotency-key') ?? null

  // Idempotency: check for existing job
  if (idempotencyKey) {
    const [existingJob] = await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.idempotencyKey, idempotencyKey))
    if (existingJob) {
      const [existingSession] = await db
        .select()
        .from(practiceSessions)
        .where(eq(practiceSessions.jobId, existingJob.id))
      if (existingSession) {
        return NextResponse.json(
          { sessionId: existingSession.id, status: existingSession.status, jobId: existingJob.id },
          { status: 200 },
        )
      }
    }
  }

  const body = await req.json() as { moduleIds?: string[]; lectureIds?: string[] }
  const { moduleIds = [], lectureIds = [] } = body

  // Expand moduleIds to lecture ids (published + parsed)
  let resolvedIds = [...lectureIds]
  if (moduleIds.length > 0) {
    const modLectures = await db
      .select({ id: lectures.id, moduleId: lectures.moduleId, parseStatus: lectures.parseStatus })
      .from(lectures)
      .innerJoin(modules, eq(lectures.moduleId, modules.id))
      .where(
        and(
          inArray(lectures.moduleId, moduleIds),
          eq(modules.status, 'published'),
          eq(lectures.parseStatus, 'parsed'),
        ),
      )
    resolvedIds.push(...modLectures.map((l) => l.id))
  }

  // Deduplicate
  resolvedIds = [...new Set(resolvedIds)]

  // Filter: only parsed lectures in published modules
  if (resolvedIds.length > 0) {
    const validLectures = await db
      .select({ id: lectures.id })
      .from(lectures)
      .innerJoin(modules, eq(lectures.moduleId, modules.id))
      .where(
        and(
          inArray(lectures.id, resolvedIds),
          eq(modules.status, 'published'),
          eq(lectures.parseStatus, 'parsed'),
        ),
      )
    resolvedIds = validLectures.map((l) => l.id)
  }

  if (resolvedIds.length === 0) {
    return apiError('empty_selection', 'No published, parsed lectures found in the selection', 400)
  }

  const n = Math.min(Math.max(resolvedIds.length * 3, 5), 20)

  // Double-click dedup: look for recent in-progress/generating sessions
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
  const recentSessions = await db
    .select()
    .from(practiceSessions)
    .where(
      and(
        eq(practiceSessions.userId, identity.userId),
        inArray(practiceSessions.status, ['generating', 'in_progress']),
        gte(practiceSessions.createdAt, twoMinutesAgo),
      ),
    )

  const sortedKey = [...resolvedIds].sort().join(',')
  const duplicate = recentSessions.find((s) => {
    const sel = s.selection as { lectureIds?: string[] }
    const existing = [...(sel.lectureIds ?? [])].sort().join(',')
    return existing === sortedKey
  })
  if (duplicate) {
    return NextResponse.json(
      { sessionId: duplicate.id, status: duplicate.status, jobId: duplicate.jobId },
      { status: 200 },
    )
  }

  const withinBudget = await checkJobBudget(identity.userId)
  if (!withinBudget) {
    return apiError('rate_limited', 'Generation job budget exceeded (30 per hour)', 429, { retryable: true })
  }

  const [job] = await db
    .insert(generationJobs)
    .values({
      type: 'practice_quiz',
      requestedBy: identity.userId,
      idempotencyKey,
      input: { lectureIds: resolvedIds, n },
      status: 'queued',
    })
    .returning()

  await enqueueJob(job!.id)

  const [session] = await db
    .insert(practiceSessions)
    .values({
      userId: identity.userId,
      selection: { moduleIds, lectureIds: resolvedIds },
      status: 'generating',
      jobId: job!.id,
    })
    .returning()

  return NextResponse.json(
    { sessionId: session!.id, status: 'generating', jobId: job!.id },
    { status: 202 },
  )
}

export async function GET(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get('status')

  const conditions = [eq(practiceSessions.userId, identity.userId)]
  if (statusFilter) {
    conditions.push(eq(practiceSessions.status, statusFilter as 'generating'))
  }

  const rows = await db
    .select()
    .from(practiceSessions)
    .where(and(...conditions))
    .orderBy(desc(practiceSessions.createdAt))

  return NextResponse.json(rows)
}
