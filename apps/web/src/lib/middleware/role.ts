import { NextResponse } from 'next/server'
import type { Identity } from './identity'
import { apiError } from '../errors'

export function enforceTeacher(identity: Identity): NextResponse | null {
  if (identity.role !== 'teacher') {
    return apiError('forbidden', 'Teacher role required', 403)
  }
  return null
}
