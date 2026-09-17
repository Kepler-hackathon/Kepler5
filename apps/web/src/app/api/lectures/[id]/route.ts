import { NextRequest, NextResponse } from 'next/server'
import { db, lectures } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

// Plain lecture metadata (title, moduleId, parseStatus, ...) — distinct from bundle/
// (slide+item content) and presenter/ (teacher slide list). Needed by the client so the
// slide viewer/presenter routes (/lecture/[lectureId], no courseId/moduleId in the URL)
// can resolve which module/course a lecture belongs to for breadcrumbs and back-links.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id } = await params
  const [lecture] = await db.select().from(lectures).where(eq(lectures.id, id))
  if (!lecture) return apiError('not_found', 'Lecture not found', 404)
  return NextResponse.json(lecture)
}
