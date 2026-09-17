import { getPool } from '@/lib/db';

// Strict health: verifies the Secrets Manager → task → Postgres wiring end to end (plan §4, §14.13 row 176).
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { rows } = await getPool().query<{ now: string; version: string }>('select now()::text as now, version()');
    const row = rows[0];
    if (!row) throw new Error('no rows returned');
    return Response.json({ ok: true, db: 'ok', now: row.now, postgres: row.version }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return Response.json(
      { ok: false, db: 'error', message: err instanceof Error ? err.message : String(err) },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
