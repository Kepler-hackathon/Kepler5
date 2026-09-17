import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { db, faqThreads, modules, lectures, slides } from '@kepler/db'
import { resolveTag } from '@kepler/db'
import { eq, and, desc, sql, ne, getTableColumns } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'
import { bedrock } from '@/lib/bedrock'

export const dynamic = 'force-dynamic'

const classificationSchema = z.object({
  class: z.enum(['question', 'logistics', 'spam']),
  confidence: z.number().min(0).max(1),
  suggestedSlideIndex: z.number().optional(),
  concepts: z.array(z.string()),
})

export async function POST(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const text = await req.text()
  if (text.length > 20480) return apiError('body_too_large', 'Body exceeds 20 KB limit', 413)

  const body = JSON.parse(text) as {
    title?: string
    bodyMd?: string
    tagModuleId?: string
    tagLectureId?: string | null
    tagSlideId?: string | null
    suggestedSlideIndex?: number
  }

  const { title, bodyMd, tagModuleId, tagLectureId, tagSlideId, suggestedSlideIndex } = body

  if (!title || !bodyMd || !tagModuleId) {
    return apiError('bad_request', 'title, bodyMd, and tagModuleId are required', 400)
  }
  if (title.length > 150) {
    return apiError('bad_request', 'title must be ≤150 characters', 400)
  }

  const tagLevel = tagSlideId ? 'slide' : tagLectureId ? 'lecture' : 'module'
  const tagError = await resolveTag({ tagModuleId, tagLectureId, tagSlideId, tagLevel })
  if (tagError) return apiError('invalid_tag', tagError.message, 400)

  const [mod] = await db.select({ status: modules.status, name: modules.name })
    .from(modules)
    .where(eq(modules.id, tagModuleId))
  if (!mod) return apiError('not_found', 'Module not found', 404)
  if (mod.status === 'draft') {
    return apiError('invalid_tag', 'Cannot tag threads to draft modules', 400)
  }

  let classification: 'question' | 'logistics' | 'spam' = 'question'
  let classificationMeta: Record<string, unknown> = {}

  if (process.env.AI_DISABLED === 'true') {
    classificationMeta = { error: 'ai_disabled' }
  } else {
    try {
      const prompt = [
        `Classify this forum thread for a course module called "${mod.name}".`,
        '',
        `Title: ${title}`,
        `Body: ${bodyMd}`,
        `Tag level: ${tagLevel}`,
        '',
        'Categories:',
        '- question: an educational question about course content',
        '- logistics: about course schedule, grading, deadlines, or administration',
        '- spam: off-topic, inappropriate, or irrelevant',
        '',
        'Return the most appropriate class, your confidence (0–1), any relevant concept labels, and optionally a suggestedSlideIndex if the question is clearly about a specific slide.',
      ].join('\n')

      const result = await generateObject({
        model: bedrock(process.env.BEDROCK_MODEL_FAST ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0'),
        schema: classificationSchema,
        prompt,
        abortSignal: AbortSignal.timeout(5000),
      })
      classification = result.object.class
      classificationMeta = {
        confidence: result.object.confidence,
        concepts: result.object.concepts,
        suggestedSlideIndex: result.object.suggestedSlideIndex ?? suggestedSlideIndex,
      }
    } catch {
      classificationMeta = { error: 'classification_failed' }
    }
  }

  const [thread] = await db
    .insert(faqThreads)
    .values({
      authorId: identity.userId,
      title,
      bodyMd,
      tagModuleId,
      tagLectureId: tagLectureId ?? null,
      tagSlideId: tagSlideId ?? null,
      tagLevel,
      classification,
      classificationMeta,
    })
    .returning()

  return NextResponse.json(thread, { status: 201 })
}

export async function GET(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const url = new URL(req.url)
  const chip = url.searchParams.get('chip')
  const moduleId = url.searchParams.get('moduleId')
  const lectureId = url.searchParams.get('lectureId')
  const slideId = url.searchParams.get('slideId')
  const q = url.searchParams.get('q')
  const includeLogistics = url.searchParams.get('includeLogistics') === 'true'
  const cursor = url.searchParams.get('cursor')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 50)

  const conditions = []

  if (moduleId) conditions.push(eq(faqThreads.tagModuleId, moduleId))
  if (lectureId) conditions.push(eq(faqThreads.tagLectureId, lectureId))
  if (slideId) conditions.push(eq(faqThreads.tagSlideId, slideId))
  if (chip && ['question', 'logistics', 'spam'].includes(chip)) {
    conditions.push(eq(faqThreads.classification, chip as 'question' | 'logistics' | 'spam'))
  }
  if (q) {
    conditions.push(sql`${faqThreads.search} @@ plainto_tsquery('english', ${q})`)
  }
  if (!includeLogistics && identity.role !== 'teacher') {
    conditions.push(ne(faqThreads.classification, 'logistics'))
  }

  if (cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as {
        endorsed: boolean
        createdAt: string
        id: string
      }
      conditions.push(
        sql`(${faqThreads.endorsed}, ${faqThreads.createdAt}, ${faqThreads.id}) < (${decoded.endorsed}, ${decoded.createdAt}::timestamptz, ${decoded.id}::uuid)`
      )
    } catch {
      // ignore invalid cursor
    }
  }

  const rows = await db
    .select({
      ...getTableColumns(faqThreads),
      tagLectureName: lectures.title,
      tagSlideIndex: slides.index,
    })
    .from(faqThreads)
    .leftJoin(lectures, eq(faqThreads.tagLectureId, lectures.id))
    .leftJoin(slides, eq(faqThreads.tagSlideId, slides.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(faqThreads.endorsed), desc(faqThreads.createdAt), desc(faqThreads.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const threads = hasMore ? rows.slice(0, limit) : rows
  const last = threads[threads.length - 1]
  const nextCursor = hasMore && last
    ? Buffer.from(JSON.stringify({ endorsed: last.endorsed, createdAt: last.createdAt, id: last.id })).toString('base64')
    : null

  return NextResponse.json({ threads, nextCursor })
}
