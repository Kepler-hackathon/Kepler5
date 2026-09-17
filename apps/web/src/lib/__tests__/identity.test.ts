import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { getIdentity } from '../middleware/identity'

function makeReq(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/test', { headers })
}

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

describe('getIdentity', () => {
  it('returns null when x-kepler-user header is missing', () => {
    const req = makeReq({ 'x-kepler-role': 'student' })
    expect(getIdentity(req)).toBeNull()
  })

  it('returns null when x-kepler-role header is missing', () => {
    const req = makeReq({ 'x-kepler-user': VALID_UUID })
    expect(getIdentity(req)).toBeNull()
  })

  it('returns null for an invalid role value', () => {
    const req = makeReq({ 'x-kepler-user': VALID_UUID, 'x-kepler-role': 'admin' })
    expect(getIdentity(req)).toBeNull()
  })

  it('returns null when userId fails the UUID format check', () => {
    const req = makeReq({ 'x-kepler-user': 'not-a-uuid', 'x-kepler-role': 'student' })
    expect(getIdentity(req)).toBeNull()
  })

  it('returns identity for a valid student', () => {
    const req = makeReq({ 'x-kepler-user': VALID_UUID, 'x-kepler-role': 'student' })
    expect(getIdentity(req)).toEqual({ userId: VALID_UUID, role: 'student' })
  })

  it('returns identity for a valid teacher', () => {
    const req = makeReq({ 'x-kepler-user': VALID_UUID, 'x-kepler-role': 'teacher' })
    expect(getIdentity(req)).toEqual({ userId: VALID_UUID, role: 'teacher' })
  })
})
