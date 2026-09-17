import { describe, it, expect } from 'vitest'
import { GET } from '../health/route'

describe('GET /api/health', () => {
  it('returns 200 with ok: true', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; version: string; region: string | null }
    expect(body.ok).toBe(true)
  })

  it('includes version and region fields', async () => {
    const res = await GET()
    const body = await res.json() as { ok: boolean; version: string; region: string | null }
    expect(body).toHaveProperty('version')
    expect(body).toHaveProperty('region')
  })

  it('returns Cache-Control: no-store', async () => {
    const res = await GET()
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})
