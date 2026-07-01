import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { put } from "@vercel/blob";

type UploadInput = {
  key: string;
  body: Buffer | Uint8Array | ArrayBuffer;
  contentType: string;
};

type UploadResult = {
  url: string;
  provider: "r2" | "vercel-blob";
};

let r2Client: S3Client | null = null;

function cleanEnv(value: string | undefined) {
  return value?.trim().replace(/^"|"$/g, "") || "";
}

function r2Config() {
  const accountId = cleanEnv(process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID);
  const accessKeyId = cleanEnv(process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID);
  const secretAccessKey = cleanEnv(process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY);
  const bucket = cleanEnv(process.env.R2_BUCKET || process.env.CLOUDFLARE_R2_BUCKET);
  const publicUrl = cleanEnv(process.env.R2_PUBLIC_URL || process.env.R2_PUBLIC_BASE_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL);

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

export function hasR2Storage() {
  const config = r2Config();
  return Boolean(config.accountId && config.accessKeyId && config.secretAccessKey && config.bucket && config.publicUrl);
}

export function hasVercelBlobStorage() {
  return Boolean(cleanEnv(process.env.BLOB_READ_WRITE_TOKEN));
}

export function hasPersistentFileStorage() {
  return hasR2Storage() || hasVercelBlobStorage();
}

function getR2Client() {
  const config = r2Config();
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
  }
  return r2Client;
}

function bodyToBuffer(body: Buffer | Uint8Array | ArrayBuffer) {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  return Buffer.from(body);
}

export function publicStorageUrl(key: string) {
  const { publicUrl } = r2Config();
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${publicUrl.replace(/\/+$/, "")}/${encodedKey}`;
}

export async function uploadFile(input: UploadInput): Promise<UploadResult> {
  const body = bodyToBuffer(input.body);

  if (hasR2Storage()) {
    const { bucket } = r2Config();
    await getR2Client().send(new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: body,
      ContentType: input.contentType
    }));
    return { url: publicStorageUrl(input.key), provider: "r2" };
  }

  if (hasVercelBlobStorage()) {
    const blob = await put(input.key, body, {
      access: "public",
      contentType: input.contentType,
      allowOverwrite: true
    });
    return { url: blob.url, provider: "vercel-blob" };
  }

  throw new Error("Nenhum storage persistente configurado. Configure R2_* ou BLOB_READ_WRITE_TOKEN.");
}

