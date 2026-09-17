import { describe, it, expect } from 'vitest'
import { enforceTeacher } from '../middleware/role'
import type { Identity } from '../middleware/identity'

describe('enforceTeacher', () => {
  it('returns null for a teacher identity', async () => {
    const identity: Identity = { userId: 'u1', role: 'teacher' }
    expect(enforceTeacher(identity)).toBeNull()
  })

  it('returns a 403 NextResponse for a student identity', async () => {
    const identity: Identity = { userId: 'u1', role: 'student' }
    const result = enforceTeacher(identity)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(403)
    const body = await result!.json() as { error: { code: string } }
    expect(body.error.code).toBe('forbidden')
  })
})
