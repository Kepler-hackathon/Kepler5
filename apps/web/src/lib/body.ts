import { apiError } from './errors'

export async function readJsonBody<T = unknown>(
  req: Request,
  maxBytes = 65536,
): Promise<{ data: T } | { error: Response }> {
  const text = await req.text()
  if (text.length > maxBytes) {
    return { error: apiError('body_too_large', 'Request body exceeds 64 KB limit', 413) }
  }
  try {
    return { data: JSON.parse(text) as T }
  } catch {
    return { error: apiError('bad_request', 'Invalid JSON body', 400) }
  }
}
