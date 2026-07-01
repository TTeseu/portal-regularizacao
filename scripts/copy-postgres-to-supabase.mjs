import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";

const ENV_FILES = [".env.migration.local", ".env.import.local", ".env.local", ".env.production.local"];
const BATCH_SIZE = Number(process.env.MIGRATION_BATCH_SIZE || 250);

for (const file of ENV_FILES) {
  if (!existsSync(file)) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const sourceUrl = process.env.SOURCE_DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.OLD_DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

if (!sourceUrl) {
  throw new Error("Defina SOURCE_DATABASE_URL, NEON_DATABASE_URL ou OLD_DATABASE_URL com o banco antigo.");
}

if (!targetUrl) {
  throw new Error("Defina TARGET_DATABASE_URL ou SUPABASE_DATABASE_URL com o banco Supabase.");
}

const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });

const TABLES = [
  ["user", "User"],
  ["account", "Account"],
  ["session", "Session"],
  ["verificationToken", "VerificationToken"],
  ["authenticator", "Authenticator"],
  ["empresa", "Empresa"],
  ["notificacao", "Notificacao"],
  ["historicoDownload", "HistoricoDownload"],
  ["notificaFacilNotification", "NotificaFacilNotification"],
  ["notificaFacilBaseNotificacao", "NotificaFacilBaseNotificacao"],
  ["notificaFacilEmpresa", "NotificaFacilEmpresa"],
  ["notificaFacilActivityLog", "NotificaFacilActivityLog"],
  ["notificaFacilNotificationCounter", "NotificaFacilNotificationCounter"],
  ["notificaFacilRelatorioEmpresaClandestina", "NotificaFacilRelatorioEmpresaClandestina"],
  ["notificaFacilRawEntity", "NotificaFacilRawEntity"]
];

function stripHeavyFields(model, row) {
  if (process.env.COPY_PDF_BASE64 === "true") return row;
  if (model === "notificacao") return { ...row, pdf_base64: null };
  if (model === "notificaFacilNotification") return { ...row, pdf_base64: null };
  return row;
}

async function copyTable(model, label) {
  const from = source[model];
  const to = target[model];
  let copied = 0;
  let skipped = 0;

  for (let skip = 0; ; skip += BATCH_SIZE) {
    const rows = await from.findMany({ skip, take: BATCH_SIZE });
    if (!rows.length) break;

    const data = rows.map((row) => stripHeavyFields(model, row));
    try {
      const result = await to.createMany({ data, skipDuplicates: true });
      copied += result.count;
      skipped += data.length - result.count;
    } catch (error) {
      console.error(`[${label}] falhou no lote skip=${skip}:`, error);
      throw error;
    }
  }

  console.log(`${label}: copiados=${copied}, ignorados=${skipped}`);
  return { label, copied, skipped };
}

try {
  console.log("Fonte existe:", Boolean(sourceUrl), "Destino existe:", Boolean(targetUrl));
  console.log("COPY_PDF_BASE64:", process.env.COPY_PDF_BASE64 === "true" ? "true" : "false");
  const result = [];
  for (const [model, label] of TABLES) {
    result.push(await copyTable(model, label));
  }
  console.log(JSON.stringify(result, null, 2));
} finally {
  await source.$disconnect();
  await target.$disconnect();
}

