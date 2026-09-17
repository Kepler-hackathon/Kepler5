import { NextRequest, NextResponse } from 'next/server'
import { db, studentProgress } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const rows = await db.select().from(studentProgress).where(eq(studentProgress.userId, identity.userId))
  return NextResponse.json(rows)
}
