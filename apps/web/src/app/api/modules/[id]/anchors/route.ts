import { NextRequest, NextResponse } from 'next/server'
import { db, modules, files, knowledgeAnchors } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { enforceTeacher } from '@/lib/middleware/role'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)
  const denied = enforceTeacher(identity)
  if (denied) return denied

  const { id } = await params
  const body = await req.json() as { fileId?: string; kind?: string }
  const { fileId, kind } = body

  if (!fileId || !kind) {
    return apiError('bad_request', 'fileId and kind are required', 400)
  }
  if (kind !== 'textbook' && kind !== 'problem_bank') {
    return apiError('bad_request', "kind must be 'textbook' or 'problem_bank'", 400)
  }

  const [mod] = await db.select().from(modules).where(eq(modules.id, id))
  if (!mod) return apiError('not_found', 'Module not found', 404)

  const [file] = await db.select().from(files).where(eq(files.id, fileId))
  if (!file) return apiError('not_found', 'File not found', 404)
  if (file.status !== 'uploaded') {
    return apiError('conflict', 'File must be in uploaded status', 409)
  }

  const [anchor] = await db
    .insert(knowledgeAnchors)
    .values({
      moduleId: id,
      fileId,
      kind: kind as 'textbook' | 'problem_bank',
    })
    .returning()

  return NextResponse.json(anchor, { status: 201 })
}
