import { NextRequest, NextResponse } from 'next/server'
import { db, modules } from '@kepler/db'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const body = await req.json() as {
    courseId?: string
    name?: string
    overviewMd?: string
    objectives?: unknown[]
    scheduleNotes?: string
    aiOptIn?: boolean
    itemsPerLecture?: number
  }

  const { courseId, name } = body
  if (!courseId || !name) {
    return apiError('bad_request', 'courseId and name are required', 400)
  }

  const [mod] = await db
    .insert(modules)
    .values({
      courseId,
      name,
      overviewMd: body.overviewMd ?? null,
      objectives: body.objectives ?? [],
      scheduleNotes: body.scheduleNotes ?? null,
      aiOptIn: body.aiOptIn ?? false,
      itemsPerLecture: body.itemsPerLecture ?? 3,
      createdBy: identity.userId,
    })
    .returning()

  return NextResponse.json(mod, { status: 201 })
}
