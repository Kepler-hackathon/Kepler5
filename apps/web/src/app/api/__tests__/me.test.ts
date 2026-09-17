import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

const { mockInsert } = vi.hoisted(() => ({ mockInsert: vi.fn() }))

vi.mock('@kepler/db', () => ({
  db: { insert: mockInsert },
  users: {},
}))

import { POST } from '../me/route'

function makeReq(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/me', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

const mockUser = { id: VALID_UUID, displayName: 'Amber Badger', defaultRole: 'student' }

describe('POST /api/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const returning = vi.fn().mockResolvedValue([mockUser])
    const onConflict = vi.fn().mockReturnValue({ returning })
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate: onConflict })
    mockInsert.mockReturnValue({ values })
  })

  it('returns 400 when identity headers are missing', async () => {
    const res = await POST(makeReq())
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('identity_required')
  })

  it('returns 400 for an invalid UUID user ID', async () => {
    const res = await POST(makeReq({ 'x-kepler-user': 'not-a-uuid', 'x-kepler-role': 'student' }))
    expect(res.status).toBe(400)
  })

  it('returns 200 with userId, displayName and role on success', async () => {
    const res = await POST(makeReq({ 'x-kepler-user': VALID_UUID, 'x-kepler-role': 'student' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { userId: string; displayName: string; role: string }
    expect(body.userId).toBe(VALID_UUID)
    expect(typeof body.displayName).toBe('string')
    expect(body.role).toBe('student')
  })

  it('calls db.insert on success', async () => {
    await POST(makeReq({ 'x-kepler-user': VALID_UUID, 'x-kepler-role': 'teacher' }))
    expect(mockInsert).toHaveBeenCalled()
  })
})
