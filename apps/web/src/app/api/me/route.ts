import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

const ADJECTIVES = ['Amber','Bright','Calm','Deft','Eager','Fair','Gentle','Honest','Keen','Lively','Merry','Noble','Quiet','Rapid','Swift','Warm']
const ANIMALS    = ['Badger','Crane','Falcon','Heron','Jaguar','Lynx','Marten','Newt','Otter','Panda','Quail','Raven','Swift','Tiger','Vole','Wren']

function stableDisplayName(userId: string): string {
  // Seeded from UUID: sum of char codes for deterministic but human-readable name
  const seed = userId.replace(/-/g, '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return `${ADJECTIVES[seed % ADJECTIVES.length]} ${ANIMALS[(seed >> 4) % ANIMALS.length]}`
}

export async function POST(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'x-kepler-user and x-kepler-role headers are required', 400)

  const displayName = stableDisplayName(identity.userId)

  const [user] = await db
    .insert(users)
    .values({ id: identity.userId, displayName, defaultRole: identity.role })
    .onConflictDoUpdate({
      target: users.id,
      set: { lastSeenAt: new Date() },
    })
    .returning()

  return NextResponse.json({ userId: user!.id, displayName: user!.displayName, role: identity.role })
}
