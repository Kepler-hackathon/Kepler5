import { NextResponse } from 'next/server'
import { apiError } from '../errors'

export function checkOwnership(resourceUserId: string, requestUserId: string): NextResponse | null {
  if (resourceUserId !== requestUserId) {
    return apiError('forbidden', 'You do not have access to this resource', 403)
  }
  return null
}
