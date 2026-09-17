import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const TEACHER_UUID = '00000000-0000-0000-0000-000000000002'
const STUDENT_UUID = '00000000-0000-0000-0000-000000000003'
const MODULE_ID = '00000000-0000-0000-0000-000000000010'
const COURSE_ID = '00000000-0000-0000-0000-000000000020'

const { mockSelect, mockInsert, mockUpdate } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
}))

vi.mock('@kepler/db', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate },
  modules: {},
}))

import { POST } from '../modules/route'
import { GET, PATCH } from '../modules/[id]/route'

const mockModule = {
  id: MODULE_ID,
  courseId: COURSE_ID,
  name: 'Test Module',
  status: 'draft',
  aiOptIn: false,
  itemsPerLecture: 3,
  createdBy: TEACHER_UUID,
  objectives: [],
}

function makeReq(method: string, headers: Record<string, string>, body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/modules', {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const teacherHeaders = { 'x-kepler-user': TEACHER_UUID, 'x-kepler-role': 'teacher' }
const studentHeaders = { 'x-kepler-user': STUDENT_UUID, 'x-kepler-role': 'student' }

function setupInsert(result: unknown) {
  const returning = vi.fn().mockResolvedValue([result])
  const values = vi.fn().mockReturnValue({ returning })
  mockInsert.mockReturnValue({ values })
}

function setupSelect(result: unknown) {
  const where = vi.fn().mockResolvedValue([result].filter(Boolean))
  const from = vi.fn().mockReturnValue({ where })
  mockSelect.mockReturnValue({ from })
}

function setupSelectEmpty() {
  const where = vi.fn().mockResolvedValue([])
  const from = vi.fn().mockReturnValue({ where })
  mockSelect.mockReturnValue({ from })
}

function setupUpdate(result: unknown) {
  const returning = vi.fn().mockResolvedValue(result ? [result] : [])
  const where = vi.fn().mockReturnValue({ returning })
  const set = vi.fn().mockReturnValue({ where })
  mockUpdate.mockReturnValue({ set })
}

describe('POST /api/modules', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when identity headers are missing', async () => {
    const res = await POST(makeReq('POST', {}, { courseId: COURSE_ID, name: 'M' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('identity_required')
  })

  it('returns 403 for a student', async () => {
    const res = await POST(makeReq('POST', studentHeaders, { courseId: COURSE_ID, name: 'M' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when courseId is missing', async () => {
    const res = await POST(makeReq('POST', teacherHeaders, { name: 'M' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when name is missing', async () => {
    const res = await POST(makeReq('POST', teacherHeaders, { courseId: COURSE_ID }))
    expect(res.status).toBe(400)
  })

  it('returns 201 and the created module for a valid teacher request', async () => {
    setupInsert(mockModule)
    const res = await POST(makeReq('POST', teacherHeaders, { courseId: COURSE_ID, name: 'Test Module' }))
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string }
    expect(body.id).toBe(MODULE_ID)
  })
})

describe('GET /api/modules/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when identity headers are missing', async () => {
    const res = await GET(makeReq('GET', {}), { params: Promise.resolve({ id: MODULE_ID }) })
    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown module', async () => {
    setupSelectEmpty()
    const res = await GET(makeReq('GET', teacherHeaders), { params: Promise.resolve({ id: 'unknown' }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 when a student requests a draft module', async () => {
    setupSelect({ ...mockModule, status: 'draft' })
    const res = await GET(makeReq('GET', studentHeaders), { params: Promise.resolve({ id: MODULE_ID }) })
    expect(res.status).toBe(404)
  })

  it('returns 200 when a teacher requests a draft module', async () => {
    setupSelect({ ...mockModule, status: 'draft' })
    const res = await GET(makeReq('GET', teacherHeaders), { params: Promise.resolve({ id: MODULE_ID }) })
    expect(res.status).toBe(200)
  })

  it('returns 200 when a student requests a published module', async () => {
    setupSelect({ ...mockModule, status: 'published' })
    const res = await GET(makeReq('GET', studentHeaders), { params: Promise.resolve({ id: MODULE_ID }) })
    expect(res.status).toBe(200)
  })
})

describe('PATCH /api/modules/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 without identity', async () => {
    const res = await PATCH(makeReq('PATCH', {}, { name: 'New' }), { params: Promise.resolve({ id: MODULE_ID }) })
    expect(res.status).toBe(400)
  })

  it('returns 403 for a student', async () => {
    const res = await PATCH(makeReq('PATCH', studentHeaders, { name: 'New' }), { params: Promise.resolve({ id: MODULE_ID }) })
    expect(res.status).toBe(403)
  })

  it('returns 404 when module is not found', async () => {
    setupUpdate(null)
    const res = await PATCH(makeReq('PATCH', teacherHeaders, { name: 'New' }), { params: Promise.resolve({ id: 'missing' }) })
    expect(res.status).toBe(404)
  })

  it('returns 200 with updated module on success', async () => {
    setupUpdate(mockModule)
    const res = await PATCH(makeReq('PATCH', teacherHeaders, { name: 'Updated' }), { params: Promise.resolve({ id: MODULE_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json() as { id: string }
    expect(body.id).toBe(MODULE_ID)
  })
})
