import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const USER_UUID = '00000000-0000-0000-0000-000000000005'
const SIGNED_URL = 'https://bucket.s3.amazonaws.com/key?sig=abc'

const { mockInsert, mockGetSignedUrl, mockS3Client } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockGetSignedUrl: vi.fn(),
  mockS3Client: vi.fn(),
}))

vi.mock('@kepler/db', () => ({
  db: { insert: mockInsert },
  files: {},
}))

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: mockS3Client,
  PutObjectCommand: vi.fn().mockImplementation((args) => args),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}))

vi.mock('uuidv7', () => ({
  uuidv7: () => '00000000-0000-0000-0000-000000000099',
}))

vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

import { POST } from '../uploads/route'

function makeReq(headers: Record<string, string>, body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const userHeaders = { 'x-kepler-user': USER_UUID, 'x-kepler-role': 'teacher' }
const validBody = { kind: 'deck', mime: 'application/pdf', name: 'slides.pdf', size: 1024 * 1024 }

describe('POST /api/uploads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockS3Client.mockImplementation(() => ({}))
    mockGetSignedUrl.mockResolvedValue(SIGNED_URL)
    const returning = vi.fn().mockResolvedValue([{}])
    const values = vi.fn().mockReturnValue({ returning })
    mockInsert.mockReturnValue({ values })
    delete process.env.UPLOADS_BUCKET
  })

  it('returns 400 without identity headers', async () => {
    const res = await POST(makeReq({}, validBody))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('identity_required')
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeReq(userHeaders, { kind: 'deck' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for an invalid kind', async () => {
    const res = await POST(makeReq(userHeaders, { ...validBody, kind: 'video' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('bad_request')
  })

  it('returns 400 for an unsupported MIME type', async () => {
    const res = await POST(makeReq(userHeaders, { ...validBody, mime: 'image/png' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('unsupported_mime')
  })

  it('returns 400 when file size exceeds 100 MB', async () => {
    const res = await POST(makeReq(userHeaders, { ...validBody, size: 101 * 1024 * 1024 }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('file_too_large')
  })

  it('returns 500 when UPLOADS_BUCKET env var is not set', async () => {
    const res = await POST(makeReq(userHeaders, validBody))
    expect(res.status).toBe(500)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('config_error')
  })

  it('returns 201 with fileId and uploadUrl for a valid request', async () => {
    process.env.UPLOADS_BUCKET = 'my-bucket'
    const res = await POST(makeReq(userHeaders, validBody))
    expect(res.status).toBe(201)
    const body = await res.json() as { fileId: string; uploadUrl: string }
    expect(body.fileId).toBe('00000000-0000-0000-0000-000000000099')
    expect(body.uploadUrl).toBe(SIGNED_URL)
  })

  it('accepts PPTX MIME type for deck kind', async () => {
    process.env.UPLOADS_BUCKET = 'my-bucket'
    const res = await POST(makeReq(userHeaders, {
      ...validBody,
      mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      name: 'slides.pptx',
    }))
    expect(res.status).toBe(201)
  })
})
