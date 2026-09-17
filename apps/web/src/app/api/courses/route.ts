import { NextRequest, NextResponse } from 'next/server'
import { db, courses } from '@kepler/db'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

// Lists all courses — distinct from the singular course/route.ts, which assumes a single
// demo course. Both students and teachers may list courses (mirrors course/route.ts).
export async function GET(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const rows = await db.select().from(courses).orderBy(courses.createdAt)
  return NextResponse.json({ courses: rows })
}

// No route previously existed to create a course at all (only admin/seed inserted one
// directly) — needed so a teacher can bootstrap the first course from the UI.
export async function POST(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const body = (await req.json()) as { name?: string; code?: string; term?: string; instructorName?: string }
  if (!body.name) return apiError('bad_request', 'name is required', 400)

  const [course] = await db
    .insert(courses)
    .values({
      name: body.name,
      code: body.code ?? null,
      term: body.term ?? null,
      instructorName: body.instructorName ?? null,
    })
    .returning()

  return NextResponse.json(course, { status: 201 })
}
