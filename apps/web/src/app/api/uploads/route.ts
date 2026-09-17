import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { db, files } from '@kepler/db'
import { uuidv7 } from 'uuidv7'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' })

const ACCEPTED_MIMES: Record<string, string[]> = {
  deck: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  textbook: ['application/pdf'],
  problem_bank: ['application/pdf'],
}

const MAX_SIZE_BYTES = 100 * 1024 * 1024

export async function POST(req: NextRequest) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const body = await req.json() as { kind?: string; mime?: string; name?: string; size?: number }
  const { kind, mime, name, size } = body

  if (!kind || !mime || !name || size === undefined) {
    return apiError('bad_request', 'kind, mime, name, and size are required', 400)
  }

  if (!['deck', 'textbook', 'problem_bank'].includes(kind)) {
    return apiError('bad_request', 'kind must be deck, textbook, or problem_bank', 400)
  }

  if (!(ACCEPTED_MIMES[kind] ?? []).includes(mime)) {
    return apiError('unsupported_mime', `${mime} is not accepted for kind ${kind}`, 400)
  }

  if (size > MAX_SIZE_BYTES) {
    return apiError('file_too_large', 'File size exceeds 100 MB limit', 400)
  }

  const bucket = process.env.UPLOADS_BUCKET
  if (!bucket) return apiError('config_error', 'UPLOADS_BUCKET not configured', 500)

  const fileId = uuidv7()
  const key = `uploads/${fileId}/${encodeURIComponent(name)}`

  await db.insert(files).values({
    id: fileId,
    uploaderId: identity.userId,
    kind: kind as 'deck' | 'textbook' | 'problem_bank',
    bucket,
    key,
    originalName: name,
    mime,
    sizeBytes: size,
    status: 'pending',
  })

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mime,
      ContentLength: size,
    }),
    { expiresIn: 900 },
  )

  return NextResponse.json({ fileId, uploadUrl }, { status: 201 })
}
