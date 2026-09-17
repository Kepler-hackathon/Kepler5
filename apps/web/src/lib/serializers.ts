import type { Role } from './middleware/identity'

// Strip teacher-only fields before sending to students (§1 "Role adds, never forks")
export function stripTeacherFields<T extends Record<string, unknown>>(obj: T, role: Role): Omit<T, 'notes'> {
  if (role === 'teacher') return obj
  const copy = { ...obj }
  delete (copy as Record<string, unknown>)['notes']
  delete (copy as Record<string, unknown>)['reviewPendingCount']
  return copy
}
