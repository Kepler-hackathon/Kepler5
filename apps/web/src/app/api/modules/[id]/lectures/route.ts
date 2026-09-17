import { NextRequest, NextResponse } from 'next/server'
import { db, lectures, studentProgress } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id } = await params
  const rows = await db.select().from(lectures).where(eq(lectures.moduleId, id)).orderBy(lectures.orderIndex)

  if (identity.role === 'student') {
    const progressRows = await db
      .select()
      .from(studentProgress)
      .where(eq(studentProgress.userId, identity.userId))

    const progressMap = new Map(progressRows.map((p) => [p.lectureId, p]))

    return NextResponse.json(
      rows.map((l) => ({
        ...l,
        progress: progressMap.get(l.id) ?? null,
      }))
    )
  }

  return NextResponse.json(rows)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { id } = await params
  const body = await req.json() as Array<{ lectureId?: string; fileId?: string; title: string }>

  await db.transaction(async (tx) => {
    // Replace existing lectures for this module
    await tx.delete(lectures).where(eq(lectures.moduleId, id))
    if (body.length > 0) {
      await tx.insert(lectures).values(
        body.map((item, idx) => ({
          id: item.lectureId,
          moduleId: id,
          title: item.title,
          orderIndex: idx + 1,
          deckFileId: item.fileId ?? null,
        }))
      )
    }
  })

  const updated = await db.select().from(lectures).where(eq(lectures.moduleId, id)).orderBy(lectures.orderIndex)
  return NextResponse.json(updated)
}
