import { describe, it, expect } from 'vitest'
import { apiError } from '../errors'

describe('apiError', () => {
  it('returns a response with the given status code', () => {
    const res = apiError('not_found', 'Not found', 404)
    expect(res.status).toBe(404)
  })

  it('includes code and message in the JSON body', async () => {
    const res = apiError('bad_request', 'Missing field', 400)
    const body = await res.json() as { error: { code: string; message: string; retryable: boolean } }
    expect(body.error.code).toBe('bad_request')
    expect(body.error.message).toBe('Missing field')
  })

  it('defaults retryable to false', async () => {
    const res = apiError('some_error', 'msg', 500)
    const body = await res.json() as { error: { retryable: boolean } }
    expect(body.error.retryable).toBe(false)
  })

  it('forwards retryable=true when specified', async () => {
    const res = apiError('rate_limited', 'Too many requests', 429, { retryable: true })
    const body = await res.json() as { error: { retryable: boolean } }
    expect(body.error.retryable).toBe(true)
  })

  it('forwards details when provided', async () => {
    const details = { field: 'name' }
    const res = apiError('validation', 'Invalid', 422, { details })
    const body = await res.json() as { error: { details: unknown } }
    expect(body.error.details).toEqual(details)
  })
})
