import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient, Prisma } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const ENV_FILES = [".env.import.local", ".env.local", ".env.production.local"];

for (const file of ENV_FILES) {
  if (!existsSync(file)) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function env(name, fallback = "") {
  return (process.env[name] || fallback).trim();
}

const accountId = env("R2_ACCOUNT_ID", env("CLOUDFLARE_R2_ACCOUNT_ID", env("CLOUDFLARE_ACCOUNT_ID")));
const accessKeyId = env("R2_ACCESS_KEY_ID", env("CLOUDFLARE_R2_ACCESS_KEY_ID"));
const secretAccessKey = env("R2_SECRET_ACCESS_KEY", env("CLOUDFLARE_R2_SECRET_ACCESS_KEY"));
const bucket = env("R2_BUCKET", env("CLOUDFLARE_R2_BUCKET"));
const publicUrl = env("R2_PUBLIC_URL", env("R2_PUBLIC_BASE_URL", env("CLOUDFLARE_R2_PUBLIC_URL")));

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL nao configurado.");
}

if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
  throw new Error("Configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET e R2_PUBLIC_URL.");
}

const prisma = new PrismaClient();
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey }
});

function publicStorageUrl(key) {
  return `${publicUrl.replace(/\/+$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function upload(key, body, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType
  }));
  return publicStorageUrl(key);
}

function parseDataUrl(value) {
  const match = String(value || "").match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!match) return null;
  const contentType = match[1] || "application/octet-stream";
  const body = match[2] ? Buffer.from(match[3], "base64") : Buffer.from(decodeURIComponent(match[3]));
  return { contentType, body };
}

function extensionFromType(contentType) {
  if (contentType.includes("pdf")) return "pdf";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("html")) return "html";
  return "bin";
}

async function migrateRegularizacaoPdfs() {
  let migrated = 0;
  const rows = await prisma.notificacao.findMany({
    where: { pdf_base64: { not: null } },
    select: { id: true, pdf_base64: true }
  });

  for (const row of rows) {
    if (!row.pdf_base64) continue;
    const key = `regularizacao/notificacoes/migrated/${row.id}.pdf`;
    const url = await upload(key, Buffer.from(row.pdf_base64, "base64"), "application/pdf");
    await prisma.notificacao.update({
      where: { id: row.id },
      data: { pdfUrl: url, pdf_base64: null, updated_date: new Date() }
    });
    migrated += 1;
  }
  return migrated;
}

async function migrateNotificaFacilPdfs() {
  let migrated = 0;
  const rows = await prisma.notificaFacilNotification.findMany({
    where: { pdf_base64: { not: null } },
    select: { id: true, pdf_base64: true }
  });

  for (const row of rows) {
    if (!row.pdf_base64) continue;
    const key = `notifica-facil/notifications/migrated/${row.id}.pdf`;
    const url = await upload(key, Buffer.from(row.pdf_base64, "base64"), "application/pdf");
    await prisma.notificaFacilNotification.update({
      where: { id: row.id },
      data: { pdf_url: url, pdf_base64: null, updated_date: new Date() }
    });
    migrated += 1;
  }
  return migrated;
}

async function migrateResponseAttachments() {
  let migrated = 0;
  const rows = await prisma.notificaFacilNotification.findMany({
    where: { anexos_resposta_email: { not: Prisma.JsonNull } },
    select: { id: true, anexos_resposta_email: true }
  });

  for (const row of rows) {
    if (!Array.isArray(row.anexos_resposta_email)) continue;
    let changed = false;
    const next = [];

    for (const item of row.anexos_resposta_email) {
      if (!item || typeof item !== "object" || typeof item.url !== "string") {
        next.push(item);
        continue;
      }

      const parsed = parseDataUrl(item.url);
      if (!parsed) {
        next.push(item);
        continue;
      }

      const safeName = String(item.nome || item.name || `${randomUUID()}.${extensionFromType(parsed.contentType)}`)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .slice(0, 120);
      const key = `notifica-facil/respostas-clientes/migrated/${row.id}/${Date.now()}-${safeName}`;
      const url = await upload(key, parsed.body, parsed.contentType);
      next.push({ ...item, url, tipo: item.tipo || parsed.contentType });
      changed = true;
      migrated += 1;
    }

    if (changed) {
      await prisma.notificaFacilNotification.update({
        where: { id: row.id },
        data: {
          anexos_resposta_email: next,
          updated_date: new Date()
        }
      });
    }
  }

  return migrated;
}

try {
  console.log("DATABASE_URL existe:", Boolean(process.env.DATABASE_URL));
  console.log("R2 bucket:", bucket);
  const regularizacao = await migrateRegularizacaoPdfs();
  const notificaFacil = await migrateNotificaFacilPdfs();
  const anexos = await migrateResponseAttachments();
  console.log(JSON.stringify({ regularizacaoPdfs: regularizacao, notificaFacilPdfs: notificaFacil, anexosResposta: anexos }, null, 2));
} finally {
  await prisma.$disconnect();
}
