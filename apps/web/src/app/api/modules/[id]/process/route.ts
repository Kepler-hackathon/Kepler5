import { NextRequest, NextResponse } from 'next/server'
import { db, modules, lectures, files, processingRuns, lectureProcessing } from '@kepler/db'
import { eq, and, inArray } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'
import { startProcessModule } from '@/lib/sfn'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { id } = await params

  const [mod] = await db.select().from(modules).where(eq(modules.id, id))
  if (!mod) return apiError('not_found', 'Module not found', 404)

  // Check for already-running execution (idempotency)
  const [running] = await db
    .select()
    .from(processingRuns)
    .where(and(eq(processingRuns.moduleId, id), eq(processingRuns.status, 'running')))
    .limit(1)

  if (running) {
    return NextResponse.json({ runId: running.id, status: 'running' }, { status: 202 })
  }

  const moduleLectures = await db
    .select()
    .from(lectures)
    .where(eq(lectures.moduleId, id))
    .orderBy(lectures.orderIndex)

  if (moduleLectures.length === 0) {
    return apiError('bad_request', 'Module has no lectures', 400)
  }

  // Validate all lectures have an uploaded file
  const fileIds = moduleLectures.map((l) => l.deckFileId).filter(Boolean) as string[]
  if (fileIds.length !== moduleLectures.length) {
    return apiError('uploads_pending', 'All lectures must have a deck file assigned', 409)
  }

  const uploadedFiles = await db
    .select()
    .from(files)
    .where(and(inArray(files.id, fileIds), eq(files.status, 'uploaded')))

  if (uploadedFiles.length !== fileIds.length) {
    return apiError('uploads_pending', 'All lecture files must be uploaded before processing', 409)
  }

  // Create processing run and per-lecture rows in a transaction
  const runId = await db.transaction(async (tx) => {
    const [run] = await tx
      .insert(processingRuns)
      .values({ moduleId: id, status: 'pending' })
      .returning()

    await tx.insert(lectureProcessing).values(
      moduleLectures.map((l) => ({
        runId: run!.id,
        lectureId: l.id,
        parseStatus: 'pending' as const,
        genStatus: 'pending' as const,
      })),
    )

    await tx.update(modules).set({ status: 'processing' }).where(eq(modules.id, id))
    return run!.id
  })

  await startProcessModule({
    runId,
    moduleId: id,
    lectureIds: moduleLectures.map((l) => l.id),
  })

  return NextResponse.json({ runId, status: 'running' }, { status: 202 })
}
