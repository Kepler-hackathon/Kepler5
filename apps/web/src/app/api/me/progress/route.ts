import { NextRequest, NextResponse } from 'next/server'
import { db, studentProgress, lectures } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const rows = await db
    .select({
      lectureId: studentProgress.lectureId,
      maxSlideIndex: studentProgress.maxSlideIndex,
      completedAt: studentProgress.completedAt,
      lastSlideId: studentProgress.lastSlideId,
      title: lectures.title,
    })
    .from(studentProgress)
    .innerJoin(lectures, eq(studentProgress.lectureId, lectures.id))
    .where(eq(studentProgress.userId, identity.userId))

  return NextResponse.json(rows)
}
