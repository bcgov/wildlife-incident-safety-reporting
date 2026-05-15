import { readFileSync } from 'node:fs'
import * as path from 'node:path'
import { S3Client } from 'bun'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

async function upload() {
  const accessKeyId = requireEnv('S3_ACCESS_KEY')
  const secretAccessKey = requireEnv('S3_SECRET_KEY')
  const endpoint = requireEnv('S3_ENDPOINT_URL')
  const bucket = requireEnv('S3_BUCKET')
  const filename = process.env.WARS_SEED_FILE ?? 'WARs.csv'
  const objectKey = process.env.S3_OBJECT_KEY ?? filename

  const root = path.resolve(import.meta.dir, '..')
  const localPath = path.join(root, 'data', 'seed', filename)
  const buffer = readFileSync(localPath)

  const client = new S3Client({
    accessKeyId,
    secretAccessKey,
    endpoint,
    bucket,
  })

  console.log(
    `Uploading ${buffer.byteLength} bytes from ${localPath} to s3://${bucket}/${objectKey}...`,
  )
  await client.file(objectKey).write(buffer, { type: 'text/csv' })
  console.log('Upload complete')
}

try {
  await upload()
  process.exit(0)
} catch (err) {
  console.error('Upload failed:', err)
  process.exit(1)
}
