import { NextRequest, NextResponse } from 'next/server'
import { db, chatThreads } from '@kepler/db'
import { eq, desc } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const body = await req.json() as {
    scope?: string
    scopeId?: string
    origin?: string
  }

  const { scope, scopeId, origin } = body

  const validScopes = ['slide', 'lecture', 'module', 'course'] as const
  if (!scope || !validScopes.includes(scope as typeof validScopes[number])) {
    return apiError('bad_request', 'scope must be slide, lecture, module, or course', 400)
  }

  const [thread] = await db
    .insert(chatThreads)
    .values({
      userId: identity.userId,
      scope: scope as typeof validScopes[number],
      scopeId: scopeId ?? null,
      origin: origin ?? null,
    })
    .returning()

  return NextResponse.json(thread, { status: 201 })
}

export async function GET(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const threads = await db
    .select()
    .from(chatThreads)
    .where(eq(chatThreads.userId, identity.userId))
    .orderBy(desc(chatThreads.lastMessageAt))
    .limit(50)

  return NextResponse.json(threads)
}
