import { NextRequest, NextResponse } from 'next/server'
import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { db, files } from '@kepler/db'
import { eq } from 'drizzle-orm'
import { getIdentity } from '@/lib/middleware/identity'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' })

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

async function readMagicBytes(bucket: string, key: string): Promise<Buffer> {
  const { Body } = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key, Range: 'bytes=0-7' }),
  )
  const chunks: Uint8Array[] = []
  for await (const chunk of Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = getIdentity(req)
  if (!identity) return apiError('identity_required', 'Identity headers required', 400)

  const { id } = await params
  const [file] = await db.select().from(files).where(eq(files.id, id))
  if (!file) return apiError('not_found', 'Upload not found', 404)
  if (file.status !== 'pending') {
    return apiError('conflict', `Upload is already ${file.status}`, 409)
  }

  const body = await req.json() as {
    courseId?: string
    moduleId?: string
    lectureId?: string
    sha256?: string
  }

  // HEAD the object to confirm it exists
  try {
    await s3.send(new HeadObjectCommand({ Bucket: file.bucket, Key: file.key }))
  } catch (err: unknown) {
    const code = (err as { name?: string; $metadata?: { httpStatusCode?: number } }).name
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
    if (code === 'NotFound' || code === 'NoSuchKey' || status === 404) {
      await db
        .update(files)
        .set({ status: 'rejected', rejectReason: 'not_in_storage' })
        .where(eq(files.id, id))
      return apiError('unprocessable', 'File not found in storage', 422)
    }
    throw err
  }

  // Sniff magic bytes
  let magic: Buffer
  try {
    magic = await readMagicBytes(file.bucket, file.key)
  } catch {
    await db
      .update(files)
      .set({ status: 'rejected', rejectReason: 'read_error' })
      .where(eq(files.id, id))
    return apiError('unprocessable', 'Could not read file content', 422)
  }

  let rejectReason: string | null = null
  if (file.mime === 'application/pdf') {
    if (!magic.slice(0, 4).equals(Buffer.from('%PDF'))) {
      rejectReason = 'magic_mismatch'
    }
  } else if (file.mime === PPTX_MIME) {
    if (magic[0] !== 0x50 || magic[1] !== 0x4b) {
      rejectReason = 'magic_mismatch'
    }
  }

  if (rejectReason) {
    const [rejected] = await db
      .update(files)
      .set({ status: 'rejected', rejectReason })
      .where(eq(files.id, id))
      .returning()
    return NextResponse.json({ error: { code: rejectReason, message: 'File type mismatch', retryable: false } }, { status: 422 })
  }

  // Write metadata sidecar
  const meta: Record<string, string> = {}
  if (body.courseId) meta.course_id = body.courseId
  if (body.moduleId) meta.module_id = body.moduleId
  if (body.lectureId) meta.lecture_id = body.lectureId

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: file.bucket,
        Key: `${file.key}.metadata.json`,
        Body: JSON.stringify(meta),
        ContentType: 'application/json',
      }),
    )
  } catch {
    // Non-fatal: sidecar failure shouldn't block the upload
    console.warn('[uploads/complete] Failed to write metadata sidecar for', id)
  }

  const [updated] = await db
    .update(files)
    .set({ status: 'uploaded', ...(body.sha256 ? { sha256: body.sha256 } : {}) })
    .where(eq(files.id, id))
    .returning()

  return NextResponse.json(updated)
}
