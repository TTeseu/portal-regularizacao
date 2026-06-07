import { createClient } from "@base44/sdk";
import { PrismaClient } from "@prisma/client";

const appId = process.env.NOTIFICA_FACIL_BASE44_APP_ID || "68ee37fd420f50f0c3ee471e";
const token = process.env.BASE44_TOKEN;
const serverUrl = (process.env.BASE44_SERVER_URL || "https://base44.app").replace(/\/$/, "");
const pageSize = Number(process.env.BASE44_PAGE_SIZE || 500);

if (!token) {
  throw new Error("Defina BASE44_TOKEN para sincronizar fotos/anexos do Notifica Facil.");
}

if (!process.env.DATABASE_URL) {
  throw new Error("Defina DATABASE_URL apontando para o Neon antes de sincronizar.");
}

const base44 = createClient({ appId, token, serverUrl });
const prisma = new PrismaClient();

function countArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

function jsonOrNull(value) {
  return value === undefined || value === null ? undefined : value;
}

function hasAttachmentData(row) {
  return countArray(row.fotos_censo) > 0 ||
    countArray(row.ocr_legendas) > 0 ||
    countArray(row.notificacao_assinada_anexos) > 0 ||
    countArray(row.anexos_resposta_email) > 0;
}

const report = {
  checked: 0,
  base44WithPhotos: 0,
  photosFound: 0,
  photosImported: 0,
  attachmentsImported: 0,
  updatedNotifications: 0,
  missingInPortal: [],
  inconsistencies: []
};

let skip = 0;

while (true) {
  const rows = await base44.entities.Notification.list("-created_date", pageSize, skip);
  if (!Array.isArray(rows) || rows.length === 0) break;

  for (const row of rows) {
    report.checked += 1;
    const photoCount = countArray(row.fotos_censo);
    const attachmentCount = countArray(row.notificacao_assinada_anexos) + countArray(row.anexos_resposta_email);
    if (photoCount > 0) {
      report.base44WithPhotos += 1;
      report.photosFound += photoCount;
    }

    if (!hasAttachmentData(row)) continue;

    const existing = await prisma.notificaFacilNotification.findUnique({
      where: { id: row.id },
      select: {
        id: true,
        fotos_censo: true,
        ocr_legendas: true,
        notificacao_assinada_anexos: true,
        anexos_resposta_email: true
      }
    });

    if (!existing) {
      report.missingInPortal.push(row.id);
      continue;
    }

    const existingPhotos = countArray(existing.fotos_censo);
    const existingAttachments = countArray(existing.notificacao_assinada_anexos) + countArray(existing.anexos_resposta_email);
    const shouldUpdate =
      photoCount > existingPhotos ||
      countArray(row.ocr_legendas) > countArray(existing.ocr_legendas) ||
      attachmentCount > existingAttachments;

    if (!shouldUpdate) continue;

    await prisma.notificaFacilNotification.update({
      where: { id: row.id },
      data: {
        fotos_censo: jsonOrNull(row.fotos_censo),
        ocr_legendas: jsonOrNull(row.ocr_legendas),
        notificacao_assinada_anexos: jsonOrNull(row.notificacao_assinada_anexos),
        anexos_resposta_email: jsonOrNull(row.anexos_resposta_email),
        updated_date: new Date()
      }
    });

    report.updatedNotifications += 1;
    report.photosImported += Math.max(photoCount - existingPhotos, 0);
    report.attachmentsImported += Math.max(attachmentCount - existingAttachments, 0);
  }

  if (rows.length < pageSize) break;
  skip += pageSize;
}

await prisma.$disconnect();
console.log(JSON.stringify(report, null, 2));
