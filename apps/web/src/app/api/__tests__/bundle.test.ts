import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const TEACHER_UUID = '00000000-0000-0000-0000-000000000002'
const STUDENT_UUID = '00000000-0000-0000-0000-000000000003'
const LECTURE_ID = '00000000-0000-0000-0000-000000000030'

const { mockSelect } = vi.hoisted(() => ({ mockSelect: vi.fn() }))

vi.mock('@kepler/db', () => ({
  db: { select: mockSelect },
  lectures: {},
  slides: {},
  lectureItems: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  asc: vi.fn(),
}))

import { GET } from '../lectures/[id]/bundle/route'

const mockLecture = { id: LECTURE_ID, bundleVersion: 5, moduleId: 'mod-1', title: 'Intro' }
const mockSlide = {
  id: 'slide-1', lectureId: LECTURE_ID, index: 0, subIndex: null,
  isSupplementary: false, afterSlideId: null, imageKey: null, thumbKey: null,
  width: 1920, height: 1080, text: 'Hello', content: null, notes: 'Secret note',
}

function makeReq(headers: Record<string, string>, ifNoneMatch?: string): NextRequest {
  return new NextRequest(`http://localhost/api/lectures/${LECTURE_ID}/bundle`, {
    headers: { ...headers, ...(ifNoneMatch ? { 'if-none-match': ifNoneMatch } : {}) },
  })
}

const teacherHeaders = { 'x-kepler-user': TEACHER_UUID, 'x-kepler-role': 'teacher' }
const studentHeaders = { 'x-kepler-user': STUDENT_UUID, 'x-kepler-role': 'student' }

function setupSelectSequence(results: unknown[][]) {
  let idx = 0
  mockSelect.mockImplementation(() => {
    const result = results[idx++] ?? []
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(result),
          // flat .where() for lectures
          then: (fn: (v: unknown[]) => void) => Promise.resolve(result).then(fn),
        }),
        then: (fn: (v: unknown[]) => void) => Promise.resolve(result).then(fn),
      }),
    }
  })
}

describe('GET /api/lectures/[id]/bundle', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when identity headers are missing', async () => {
    const res = await GET(makeReq({}), { params: Promise.resolve({ id: LECTURE_ID }) })
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('identity_required')
  })

  it('returns 404 for an unknown lecture', async () => {
    setupSelectSequence([[]])
    const res = await GET(makeReq(teacherHeaders), { params: Promise.resolve({ id: 'unknown' }) })
    expect(res.status).toBe(404)
  })

  it('returns 304 when ETag matches if-none-match', async () => {
    setupSelectSequence([[mockLecture]])
    const etag = `"${mockLecture.bundleVersion}"`
    const res = await GET(makeReq(teacherHeaders, etag), { params: Promise.resolve({ id: LECTURE_ID }) })
    expect(res.status).toBe(304)
  })

  it('returns 200 with version, slides and items for a valid request', async () => {
    setupSelectSequence([[mockLecture], [mockSlide], []])
    const res = await GET(makeReq(teacherHeaders), { params: Promise.resolve({ id: LECTURE_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json() as { version: number; slides: unknown[]; items: unknown[] }
    expect(body.version).toBe(mockLecture.bundleVersion)
    expect(Array.isArray(body.slides)).toBe(true)
    expect(Array.isArray(body.items)).toBe(true)
  })

  it('includes notes in slides for a teacher', async () => {
    setupSelectSequence([[mockLecture], [mockSlide], []])
    const res = await GET(makeReq(teacherHeaders), { params: Promise.resolve({ id: LECTURE_ID }) })
    const body = await res.json() as { slides: Array<{ notes?: string }> }
    expect(body.slides[0]).toHaveProperty('notes', 'Secret note')
  })

  it('omits notes in slides for a student', async () => {
    setupSelectSequence([[mockLecture], [mockSlide], []])
    const res = await GET(makeReq(studentHeaders), { params: Promise.resolve({ id: LECTURE_ID }) })
    const body = await res.json() as { slides: Array<Record<string, unknown>> }
    expect(body.slides[0]).not.toHaveProperty('notes')
  })
})
