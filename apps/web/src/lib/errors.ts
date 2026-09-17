import { NextResponse } from 'next/server'

export interface ApiError {
  code: string
  message: string
  retryable: boolean
  details?: unknown
}

export function apiError(
  code: string,
  message: string,
  status: number,
  opts?: { retryable?: boolean; details?: unknown }
): NextResponse {
  const body: { error: ApiError } = {
    error: { code, message, retryable: opts?.retryable ?? false, details: opts?.details },
  }
  return NextResponse.json(body, { status })
}
