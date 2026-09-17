import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { apiError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' })

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const bucket = process.env.ASSETS_BUCKET
  if (!bucket) return apiError('config_error', 'ASSETS_BUCKET not configured', 500)

  const { key } = await params
  const objectKey = key.join('/')

  try {
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
    )

    const body = obj.Body
    if (!body) return apiError('not_found', 'Object has no body', 404)

    const bytes = await (body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray()
    const buffer = Buffer.from(bytes)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': obj.ContentType ?? 'application/octet-stream',
        'Cache-Control': obj.CacheControl ?? 'public, max-age=3600',
      },
    })
  } catch (err: unknown) {
    const code = (err as { name?: string })?.name
    if (code === 'NoSuchKey' || code === 'AccessDenied') {
      return apiError('not_found', 'Asset not found', 404)
    }
    throw err
  }
}
