import { NextRequest, NextResponse } from 'next/server'
import { db, modules, peerWidgets } from '@kepler/db'
import { eq, and, count, sql } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const courseId = req.nextUrl.searchParams.get('courseId')
  const statusFilter = identity.role === 'teacher' ? undefined : eq(modules.status, 'published')
  const where = courseId
    ? (statusFilter ? and(eq(modules.courseId, courseId), statusFilter) : eq(modules.courseId, courseId))
    : statusFilter // no courseId given: preserves prior single-course behavior (all modules)

  const rows = await db.select().from(modules).where(where).orderBy(modules.orderIndex)

  let reviewPendingCount: number | undefined
  if (identity.role === 'teacher') {
    const [row] = await db
      .select({ count: count() })
      .from(peerWidgets)
      .where(eq(peerWidgets.status, 'in_review'))
    reviewPendingCount = Number(row?.count ?? 0)
  }

  return NextResponse.json({
    modules: rows,
    ...(identity.role === 'teacher' ? { reviewPendingCount } : {}),
  })
}
