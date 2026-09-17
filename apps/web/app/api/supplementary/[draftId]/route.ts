import { NextRequest, NextResponse } from 'next/server'
import { db, supplementaryDrafts } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { draftId } = await params
  const [draft] = await db
    .select()
    .from(supplementaryDrafts)
    .where(eq(supplementaryDrafts.id, draftId))

  if (!draft) return apiError('not_found', 'Draft not found', 404)
  return NextResponse.json(draft)
}
