import { NextRequest } from 'next/server'

export type Role = 'student' | 'teacher'

export interface Identity {
  userId: string
  role: Role
}

export function getIdentity(req: NextRequest): Identity | null {
  const userId = req.headers.get('x-kepler-user')
  const role = req.headers.get('x-kepler-role')

  if (!userId || !role) return null
  if (role !== 'student' && role !== 'teacher') return null
  // Basic UUID format check
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null

  return { userId, role: role as Role }
}
