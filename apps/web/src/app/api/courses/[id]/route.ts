import { NextRequest, NextResponse } from 'next/server'
import { db, courses } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const { id } = await params
  const [course] = await db.select().from(courses).where(eq(courses.id, id))
  if (!course) return apiError('not_found', 'Course not found', 404)
  return NextResponse.json(course)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { id } = await params
  const body = await req.json() as {
    name?: string; code?: string; term?: string; instructorName?: string;
    description?: string; syllabusUrl?: string;
    textbookTitle?: string; textbookAuthor?: string; textbookIsbn?: string; textbookUrl?: string;
    officeHours?: string; homeworkPolicy?: string; gradingPolicy?: string;
    prerequisites?: string; contactEmail?: string;
  }

  const patch = {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.code !== undefined && { code: body.code }),
    ...(body.term !== undefined && { term: body.term }),
    ...(body.instructorName !== undefined && { instructorName: body.instructorName }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.syllabusUrl !== undefined && { syllabusUrl: body.syllabusUrl }),
    ...(body.textbookTitle !== undefined && { textbookTitle: body.textbookTitle }),
    ...(body.textbookAuthor !== undefined && { textbookAuthor: body.textbookAuthor }),
    ...(body.textbookIsbn !== undefined && { textbookIsbn: body.textbookIsbn }),
    ...(body.textbookUrl !== undefined && { textbookUrl: body.textbookUrl }),
    ...(body.officeHours !== undefined && { officeHours: body.officeHours }),
    ...(body.homeworkPolicy !== undefined && { homeworkPolicy: body.homeworkPolicy }),
    ...(body.gradingPolicy !== undefined && { gradingPolicy: body.gradingPolicy }),
    ...(body.prerequisites !== undefined && { prerequisites: body.prerequisites }),
    ...(body.contactEmail !== undefined && { contactEmail: body.contactEmail }),
  }

  if (Object.keys(patch).length === 0) {
    const [course] = await db.select().from(courses).where(eq(courses.id, id))
    return course ? NextResponse.json(course) : apiError('not_found', 'Course not found', 404)
  }

  const [updated] = await db
    .update(courses)
    .set(patch)
    .where(eq(courses.id, id))
    .returning()

  if (!updated) return apiError('not_found', 'Course not found', 404)
  return NextResponse.json(updated)
}
