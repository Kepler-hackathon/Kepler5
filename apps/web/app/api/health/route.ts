// backend-plan.md §4: ALB target health check. Always 200 when the process is up so a DB blip
// does not cascade into task replacement; /api/health/deep is the strict variant.
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(
    { ok: true, version: process.env.APP_VERSION ?? 'dev', region: process.env.AWS_REGION ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
