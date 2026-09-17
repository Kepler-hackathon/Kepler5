export interface PageResult<T> {
  items: T[]
  nextCursor: string | null
}

export function buildPage<T extends { id: string }>(
  rows: T[],
  limit: number
): PageResult<T> {
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  return {
    items,
    nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
  }
}

export function parsePagination(url: URL, defaultLimit = 20): { limit: number; cursor: string | null } {
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? String(defaultLimit), 10), 100)
  const cursor = url.searchParams.get('cursor') ?? null
  return { limit, cursor }
}
