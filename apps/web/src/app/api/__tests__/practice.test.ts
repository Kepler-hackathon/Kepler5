import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const USER_UUID = '00000000-0000-0000-0000-000000000006'
const LECTURE_ID = '00000000-0000-0000-0000-000000000030'
const JOB_ID = '00000000-0000-0000-0000-000000000070'
const SESSION_ID = '00000000-0000-0000-0000-000000000080'
const IDEM_KEY = 'test-idempotency-key-001'

const { mockSelect, mockInsert, mockEnqueueJob, mockCheckJobBudget } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockEnqueueJob: vi.fn(),
  mockCheckJobBudget: vi.fn(),
}))

vi.mock('@kepler/db', () => ({
  db: { select: mockSelect, insert: mockInsert },
  practiceSessions: {},
  generationJobs: {},
  lectures: {},
  modules: {},
}))

vi.mock('@/lib/sqs', () => ({ enqueueJob: mockEnqueueJob }))
vi.mock('@/lib/budget', () => ({ checkJobBudget: mockCheckJobBudget }))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(), and: vi.fn(), inArray: vi.fn(), gte: vi.fn(), desc: vi.fn(),
}))

import { POST, GET } from '../practice/sessions/route'

const mockJob = { id: JOB_ID, status: 'queued', idempotencyKey: IDEM_KEY }
const mockSession = { id: SESSION_ID, status: 'generating', jobId: JOB_ID, selection: { lectureIds: [LECTURE_ID] } }
const mockLecture = { id: LECTURE_ID }

function makeReq(
  headers: Record<string, string>,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): NextRequest {
  return new NextRequest('http://localhost/api/practice/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers, ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const userHeaders = { 'x-kepler-user': USER_UUID, 'x-kepler-role': 'student' }

function setupSelectQueue(results: unknown[][]) {
  let idx = 0
  mockSelect.mockImplementation(() => {
    const result = results[idx++] ?? []
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          then: (fn: (v: unknown[]) => void) => Promise.resolve(result).then(fn),
          orderBy: vi.fn().mockResolvedValue(result),
        }),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            then: (fn: (v: unknown[]) => void) => Promise.resolve(result).then(fn),
          }),
        }),
      }),
    }
  })
}

function setupInsertSequence(job: unknown, session: unknown) {
  let insertIdx = 0
  mockInsert.mockImplementation(() => {
    const idx = insertIdx++
    const result = idx === 0 ? [job] : [session]
    const returning = vi.fn().mockResolvedValue(result)
    const values = vi.fn().mockReturnValue({ returning })
    return { values }
  })
}

describe('POST /api/practice/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnqueueJob.mockResolvedValue(undefined)
    mockCheckJobBudget.mockResolvedValue(true)
  })

  it('returns 400 without identity headers', async () => {
    const res = await POST(makeReq({}, { lectureIds: [LECTURE_ID] }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('identity_required')
  })

  it('returns 400 when no valid lectures are found', async () => {
    // no idempotency key → first select is valid-lectures filter (returns empty)
    // then recent sessions check (never reached, but queued)
    setupSelectQueue([[], []])
    const res = await POST(makeReq(userHeaders, { lectureIds: [LECTURE_ID] }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('empty_selection')
  })

  it('returns 429 when budget is exceeded', async () => {
    mockCheckJobBudget.mockResolvedValue(false)
    // no idempotency key → call 0: valid lectures, call 1: recent sessions
    setupSelectQueue([[mockLecture], []])
    const res = await POST(makeReq(userHeaders, { lectureIds: [LECTURE_ID] }))
    expect(res.status).toBe(429)
    const body = await res.json() as { error: { code: string; retryable: boolean } }
    expect(body.error.code).toBe('rate_limited')
    expect(body.error.retryable).toBe(true)
  })

  it('returns 202 with sessionId and status=generating for a valid request', async () => {
    // no idempotency key → call 0: valid lectures, call 1: recent sessions (empty → no dedup)
    setupSelectQueue([[mockLecture], []])
    setupInsertSequence(mockJob, mockSession)
    const res = await POST(makeReq(userHeaders, { lectureIds: [LECTURE_ID] }))
    expect(res.status).toBe(202)
    const body = await res.json() as { sessionId: string; status: string; jobId: string }
    expect(body.sessionId).toBe(SESSION_ID)
    expect(body.status).toBe('generating')
    expect(body.jobId).toBe(JOB_ID)
  })

  it('returns 200 when idempotency key matches an existing job and session', async () => {
    // idempotency: job found, session found
    setupSelectQueue([[ mockJob ], [mockSession]])
    const res = await POST(makeReq(userHeaders, { lectureIds: [LECTURE_ID] }, { 'idempotency-key': IDEM_KEY }))
    expect(res.status).toBe(200)
    const body = await res.json() as { sessionId: string; status: string }
    expect(body.sessionId).toBe(SESSION_ID)
    expect(body.status).toBe('generating')
  })
})

describe('GET /api/practice/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupSelectQueue([[mockSession]])
  })

  it('returns 400 without identity headers', async () => {
    const req = new NextRequest('http://localhost/api/practice/sessions')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 with a list of sessions', async () => {
    const req = new NextRequest('http://localhost/api/practice/sessions', {
      headers: userHeaders,
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json() as unknown[]
    expect(Array.isArray(body)).toBe(true)
  })
})
