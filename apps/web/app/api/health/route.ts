import { db } from '@kepler/db'
import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await db.execute(sql`SELECT version() AS version`)
    const version = (rows[0] as { version: string }).version
    return NextResponse.json({ ok: true, version })
  } catch {
    return NextResponse.json({ ok: false, version: null }, { status: 503 })
  }
}
