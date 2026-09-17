import { NextRequest, NextResponse } from 'next/server'
import { db, peerWidgets } from '@kepler/db'
import { eq, desc } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const widgets = await db
    .select()
    .from(peerWidgets)
    .where(eq(peerWidgets.authorId, identity.userId))
    .orderBy(desc(peerWidgets.createdAt))

  return NextResponse.json(widgets)
}
