import { NextRequest, NextResponse } from 'next/server'
import { db, faqThreads } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

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
  const [thread] = await db.select({ id: faqThreads.id }).from(faqThreads).where(eq(faqThreads.id, id))
  if (!thread) return apiError('not_found', 'Thread not found', 404)

  const [updated] = await db
    .update(faqThreads)
    .set({ endorsed: true, endorsedBy: identity.userId, endorsedAt: new Date(), updatedAt: new Date() })
    .where(eq(faqThreads.id, id))
    .returning()

  return NextResponse.json(updated)
}
