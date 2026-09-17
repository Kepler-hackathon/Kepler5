import { describe, it, expect } from 'vitest'
import { buildPage, parsePagination } from '../pagination'

describe('buildPage', () => {
  const items = Array.from({ length: 5 }, (_, i) => ({ id: `id-${i}` }))

  it('returns all items and null cursor when count is under the limit', () => {
    const result = buildPage(items, 10)
    expect(result.items).toHaveLength(5)
    expect(result.nextCursor).toBeNull()
  })

  it('truncates to limit and sets nextCursor to the last id when there are more items', () => {
    // pass limit+1 rows as if fetched from DB
    const rows = [...items, { id: 'id-extra' }]
    const result = buildPage(rows, 5)
    expect(result.items).toHaveLength(5)
    expect(result.nextCursor).toBe('id-4')
  })

  it('returns empty items and null cursor for an empty array', () => {
    const result = buildPage([], 10)
    expect(result.items).toHaveLength(0)
    expect(result.nextCursor).toBeNull()
  })
})

describe('parsePagination', () => {
  it('defaults to limit=20 and cursor=null when no params', () => {
    const url = new URL('http://localhost/api/test')
    const result = parsePagination(url)
    expect(result.limit).toBe(20)
    expect(result.cursor).toBeNull()
  })

  it('reads limit and cursor from search params', () => {
    const url = new URL('http://localhost/api/test?limit=5&cursor=abc')
    const result = parsePagination(url)
    expect(result.limit).toBe(5)
    expect(result.cursor).toBe('abc')
  })

  it('caps limit at 100', () => {
    const url = new URL('http://localhost/api/test?limit=999')
    const result = parsePagination(url)
    expect(result.limit).toBe(100)
  })

  it('uses the defaultLimit parameter when provided', () => {
    const url = new URL('http://localhost/api/test')
    const result = parsePagination(url, 50)
    expect(result.limit).toBe(50)
  })
})
