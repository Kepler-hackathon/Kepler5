import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const USER_UUID = '00000000-0000-0000-0000-000000000004'
const QUESTION_ID = '00000000-0000-0000-0000-000000000040'
const LECTURE_ID = '00000000-0000-0000-0000-000000000030'

const { mockSelect, mockInsert } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
}))

vi.mock('@kepler/db', () => ({
  db: { select: mockSelect, insert: mockInsert },
  quizQuestions: {},
  learningEvents: {},
}))

vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

import { POST } from '../questions/[id]/answer/route'

const mockQuestion = {
  id: QUESTION_ID,
  lectureId: LECTURE_ID,
  correctKey: 'A',
  explanationMd: 'Because A.',
  conceptLabel: 'Intro concept',
  sourceSlideId: null,
}

function makeReq(headers: Record<string, string>, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/questions/${QUESTION_ID}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const userHeaders = { 'x-kepler-user': USER_UUID, 'x-kepler-role': 'student' }

function setupSelect(result: unknown[]) {
  const where = vi.fn().mockResolvedValue(result)
  const from = vi.fn().mockReturnValue({ where })
  mockSelect.mockReturnValue({ from })
}

function setupInsert() {
  const returning = vi.fn().mockResolvedValue([{}])
  const values = vi.fn().mockReturnValue({ returning })
  mockInsert.mockReturnValue({ values })
}

describe('POST /api/questions/[id]/answer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupSelect([mockQuestion])
    setupInsert()
  })

  it('returns 400 without identity headers', async () => {
    const res = await POST(makeReq({}, { selectedKey: 'A' }), { params: Promise.resolve({ id: QUESTION_ID }) })
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('identity_required')
  })

  it('returns 400 when selectedKey is missing', async () => {
    const res = await POST(makeReq(userHeaders, {}), { params: Promise.resolve({ id: QUESTION_ID }) })
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('bad_request')
  })

  it('returns 404 when question does not exist', async () => {
    setupSelect([])
    const res = await POST(makeReq(userHeaders, { selectedKey: 'A' }), { params: Promise.resolve({ id: 'unknown' }) })
    expect(res.status).toBe(404)
  })

  it('returns isCorrect: true and fields for a correct answer', async () => {
    const res = await POST(makeReq(userHeaders, { selectedKey: 'A' }), { params: Promise.resolve({ id: QUESTION_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json() as { isCorrect: boolean; correctKey: string; explanationMd: string; conceptLabel: string }
    expect(body.isCorrect).toBe(true)
    expect(body.correctKey).toBe('A')
    expect(body.explanationMd).toBe('Because A.')
    expect(body.conceptLabel).toBe('Intro concept')
  })

  it('returns isCorrect: false for a wrong answer', async () => {
    const res = await POST(makeReq(userHeaders, { selectedKey: 'B' }), { params: Promise.resolve({ id: QUESTION_ID }) })
    const body = await res.json() as { isCorrect: boolean }
    expect(body.isCorrect).toBe(false)
  })

  it('inserts a learning event for every answer', async () => {
    await POST(makeReq(userHeaders, { selectedKey: 'A' }), { params: Promise.resolve({ id: QUESTION_ID }) })
    expect(mockInsert).toHaveBeenCalled()
  })
})
