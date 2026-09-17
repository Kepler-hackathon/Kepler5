import { NextRequest, NextResponse } from 'next/server'
import { db, peerWidgets, modules, resolveTag } from '@kepler/db'
import { eq, and, desc, lt, inArray } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'
import { readJsonBody } from '@/lib/body'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const parsed = await readJsonBody<{
    title?: string
    content?: unknown
    tagModuleId?: string
    tagLectureId?: string
    tagSlideId?: string
    note?: string
    questionId?: string
    questionVersion?: number
    optionKey?: string
    variant?: number
  }>(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const { title, content, tagModuleId, tagLectureId, tagSlideId, note, questionId, questionVersion, optionKey, variant } = body

  if (!title || !content || !tagModuleId) {
    return apiError('bad_request', 'title, content, and tagModuleId are required', 400)
  }
  if (title.length > 80) {
    return apiError('bad_request', 'title must be 80 characters or fewer', 400)
  }
  if (note && note.length > 280) {
    return apiError('bad_request', 'note must be 280 characters or fewer', 400)
  }

  const tagLevel = tagSlideId ? 'slide' : tagLectureId ? 'lecture' : 'module'

  const tagError = await resolveTag({ tagModuleId, tagLectureId, tagSlideId, tagLevel })
  if (tagError) return apiError(tagError.code, tagError.message, 400)

  try {
    const [widget] = await db
      .insert(peerWidgets)
      .values({
        authorId: identity.userId,
        content,
        title,
        note: note ?? null,
        citations: [],
        tagModuleId,
        tagLectureId: tagLectureId ?? null,
        tagSlideId: tagSlideId ?? null,
        tagLevel,
        questionId: questionId ?? null,
        questionVersion: questionVersion ?? null,
        optionKey: optionKey ?? null,
        variant: variant ?? null,
        status: 'collecting',
      })
      .returning()

    return NextResponse.json(widget, { status: 201 })
  } catch (err: unknown) {
    const pgErr = err as { code?: string }
    if (pgErr?.code === '23505') {
      // Unique constraint violation — find the existing widget
      const [existing] = await db
        .select({ id: peerWidgets.id })
        .from(peerWidgets)
        .where(
          and(
            eq(peerWidgets.questionId, questionId!),
            eq(peerWidgets.questionVersion, questionVersion!),
            eq(peerWidgets.optionKey, optionKey!),
            eq(peerWidgets.variant, variant!),
          ),
        )
        .limit(1)
      return NextResponse.json(
        { error: { code: 'conflict', message: 'A widget already exists for this question/option', existingWidgetId: existing?.id } },
        { status: 409 },
      )
    }
    throw err
  }
}

export async function GET(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { searchParams } = new URL(req.url)
  const moduleId = searchParams.get('moduleId')
  const lectureId = searchParams.get('lectureId')
  const slideId = searchParams.get('slideId')
  const status = searchParams.get('status')
  const cursor = searchParams.get('cursor')
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50)

  const conditions = []
  if (moduleId) conditions.push(eq(peerWidgets.tagModuleId, moduleId))
  if (lectureId) conditions.push(eq(peerWidgets.tagLectureId, lectureId))
  if (slideId) conditions.push(eq(peerWidgets.tagSlideId, slideId))
  if (status) conditions.push(eq(peerWidgets.status, status as typeof peerWidgets.status._.data))

  if (cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString())
      conditions.push(
        lt(peerWidgets.createdAt, new Date(decoded.createdAt)),
      )
    } catch {
      // ignore bad cursor
    }
  }

  const rows = await db
    .select()
    .from(peerWidgets)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(peerWidgets.createdAt), desc(peerWidgets.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore
    ? Buffer.from(JSON.stringify({ createdAt: items[items.length - 1]!.createdAt })).toString('base64')
    : null

  return NextResponse.json({ widgets: items, nextCursor })
}
