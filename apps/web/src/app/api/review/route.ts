import { NextRequest, NextResponse } from 'next/server'
import { db, peerWidgets } from '@kepler/db'
import { eq, asc, isNotNull } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { searchParams } = new URL(req.url)
  const status = (searchParams.get('status') ?? 'in_review') as typeof peerWidgets.status._.data

  const rows = await db
    .select()
    .from(peerWidgets)
    .where(eq(peerWidgets.status, status))
    .orderBy(asc(peerWidgets.enteredReviewAt))

  return NextResponse.json({ widgets: rows })
}
