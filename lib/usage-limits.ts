import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";

const DEFAULT_SUPABASE_DB_LIMIT_BYTES = 500 * 1024 * 1024;
const DEFAULT_R2_STORAGE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;
const DEFAULT_WARNING_PERCENT = 80;
const DEFAULT_CRITICAL_PERCENT = 90;
const R2_CACHE_TTL_MS = 1000 * 60 * 10;

type UsageLevel = "ok" | "warning" | "critical" | "unknown";

type UsageItem = {
  key: "supabase-db" | "r2-storage";
  label: string;
  usedBytes: number | null;
  limitBytes: number;
  percent: number | null;
  level: UsageLevel;
  message: string;
};

type CachedR2Usage = {
  bytes: number;
  objects: number;
  checkedAt: number;
};

let cachedR2Usage: CachedR2Usage | null = null;

function cleanEnv(value: string | undefined) {
  return value?.trim().replace(/^"|"$/g, "") || "";
}

function numberEnv(name: string, fallback: number) {
  const raw = cleanEnv(process.env[name]);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function percentEnv(name: string, fallback: number) {
  const parsed = numberEnv(name, fallback);
  return Math.min(Math.max(parsed, 1), 100);
}

function r2Config() {
  return {
    accountId: cleanEnv(process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID),
    accessKeyId: cleanEnv(process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID),
    secretAccessKey: cleanEnv(process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY),
    bucket: cleanEnv(process.env.R2_BUCKET || process.env.CLOUDFLARE_R2_BUCKET)
  };
}

function usageLevel(percent: number | null): UsageLevel {
  if (percent === null) return "unknown";
  const warning = percentEnv("USAGE_WARNING_PERCENT", DEFAULT_WARNING_PERCENT);
  const critical = percentEnv("USAGE_CRITICAL_PERCENT", DEFAULT_CRITICAL_PERCENT);
  if (percent >= critical) return "critical";
  if (percent >= warning) return "warning";
  return "ok";
}

function makeUsageItem(input: {
  key: UsageItem["key"];
  label: string;
  usedBytes: number | null;
  limitBytes: number;
  unavailableMessage: string;
}): UsageItem {
  const percent = input.usedBytes === null ? null : Math.min((input.usedBytes / input.limitBytes) * 100, 999);
  const level = usageLevel(percent);
  const rounded = percent === null ? null : Math.round(percent);
  const message =
    percent === null
      ? input.unavailableMessage
      : level === "critical"
        ? `${input.label} em ${rounded}% do limite configurado. Ação recomendada agora.`
        : level === "warning"
          ? `${input.label} em ${rounded}% do limite configurado. Acompanhe antes de bater o teto.`
          : `${input.label} saudável: ${rounded}% do limite configurado.`;

  return {
    key: input.key,
    label: input.label,
    usedBytes: input.usedBytes,
    limitBytes: input.limitBytes,
    percent,
    level,
    message
  };
}

async function getSupabaseDatabaseBytes() {
  const rows = await prisma.$queryRaw<Array<{ bytes: string }>>`
    SELECT pg_database_size(current_database())::text AS bytes
  `;
  return Number(rows[0]?.bytes || 0);
}

async function getR2StorageBytes() {
  const now = Date.now();
  if (cachedR2Usage && now - cachedR2Usage.checkedAt < R2_CACHE_TTL_MS) {
    return cachedR2Usage;
  }

  const config = r2Config();
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucket) {
    return null;
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });

  let bytes = 0;
  let objects = 0;
  let continuationToken: string | undefined;

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: config.bucket,
      ContinuationToken: continuationToken
    }));

    for (const item of response.Contents || []) {
      bytes += item.Size || 0;
      objects += 1;
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  cachedR2Usage = { bytes, objects, checkedAt: now };
  return cachedR2Usage;
}

export async function getUsageLimits() {
  const supabaseLimit = numberEnv("SUPABASE_DB_LIMIT_BYTES", DEFAULT_SUPABASE_DB_LIMIT_BYTES);
  const r2Limit = numberEnv("R2_STORAGE_LIMIT_BYTES", DEFAULT_R2_STORAGE_LIMIT_BYTES);

  let supabaseBytes: number | null = null;
  let r2Usage: CachedR2Usage | null = null;

  try {
    supabaseBytes = await getSupabaseDatabaseBytes();
  } catch (error) {
    console.error("[usage-limits] Falha ao medir Supabase:", error);
  }

  try {
    r2Usage = await getR2StorageBytes();
  } catch (error) {
    console.error("[usage-limits] Falha ao medir R2:", error);
  }

  const items = [
    makeUsageItem({
      key: "supabase-db",
      label: "Banco Supabase",
      usedBytes: supabaseBytes,
      limitBytes: supabaseLimit,
      unavailableMessage: "Não foi possível medir o tamanho do banco Supabase agora."
    }),
    makeUsageItem({
      key: "r2-storage",
      label: "Cloudflare R2",
      usedBytes: r2Usage?.bytes ?? null,
      limitBytes: r2Limit,
      unavailableMessage: "Não foi possível medir o storage R2 agora."
    })
  ];

  const hasWarning = items.some((item) => item.level === "warning" || item.level === "critical");

  return {
    checkedAt: new Date().toISOString(),
    warningPercent: percentEnv("USAGE_WARNING_PERCENT", DEFAULT_WARNING_PERCENT),
    criticalPercent: percentEnv("USAGE_CRITICAL_PERCENT", DEFAULT_CRITICAL_PERCENT),
    r2Objects: r2Usage?.objects ?? null,
    hasWarning,
    items
  };
}
