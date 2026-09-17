// ALB target health check: always 200 when process is up; /api/health/deep is the strict DB variant.
export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(
    { ok: true, version: process.env.APP_VERSION ?? 'dev', region: process.env.AWS_REGION ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
