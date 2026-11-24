import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * Where opted-in case files go: a PRIVATE R2 bucket (CASE_FILES_BUCKET), over
 * the S3 API, never the public media bucket. Objects are encrypted before
 * they are written (crypto.ts); the bucket only ever holds ciphertext.
 */
export interface CaseFileStore {
  put(key: string, body: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
}

function endpoint(env: Record<string, string | undefined>): string | undefined {
  return env.R2_ENDPOINT?.trim() || (env.R2_ACCOUNT_ID?.trim() ? `https://${env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com` : undefined);
}

export function caseFileStore(env: Record<string, string | undefined> = process.env): CaseFileStore | null {
  const bucket = env.CASE_FILES_BUCKET?.trim();
  const url = endpoint(env);
  if (!bucket || !url || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) return null;
  // The public media bucket is never a place for case files.
  if (bucket === env.R2_BUCKET?.trim()) return null;
  const client = new S3Client({
    endpoint: url,
    region: 'auto',
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
  return {
    async put(key, body) {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'application/octet-stream' }));
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

/** A random object key: says nothing about the case or the person. */
export const newFileKey = () => `cases/${crypto.randomUUID()}.bin`;
