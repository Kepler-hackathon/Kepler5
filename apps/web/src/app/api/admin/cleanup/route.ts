import { NextRequest, NextResponse } from 'next/server'
import { db, practiceSessions } from '@kepler/db'
import { and, eq, lt, sql } from 'drizzle-orm'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return apiError('unauthorized', 'Invalid or missing ADMIN_TOKEN', 401)
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const result = await db
    .update(practiceSessions)
    .set({ status: 'cancelled' })
    .where(
      and(
        eq(practiceSessions.status, 'in_progress'),
        lt(practiceSessions.createdAt, sevenDaysAgo),
      ),
    )
    .returning({ id: practiceSessions.id })

  return NextResponse.json({ cancelled: result.length })
}
