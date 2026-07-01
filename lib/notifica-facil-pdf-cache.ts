import type { NotificaFacilNotification } from "@prisma/client";
import { hasPersistentFileStorage, uploadFile } from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";
import { normalizeEdpLogoSourcesForPdf } from "@/lib/edp-logo-server";
import { buildNotificaFacilHtml, sanitizeNotificaFacilHtml } from "@/lib/notifica-facil-html";
import {
  PDF_RENDERER_VERSION,
  hasCurrentPdfRenderer,
  markPdfRoute,
  pdfResponse,
  renderPdfFromHtml
} from "@/lib/pdf-cache";

type PdfCacheResult = {
  bytes: Uint8Array;
  url: string;
  source: "storage" | "database" | "generated";
};

function isExternalPdfUrl(value?: string | null) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function isSelfPdfRoute(value?: string | null, id?: string) {
  return Boolean(value?.includes(`/api/notifica-facil/notifications/${id}/pdf`));
}

async function readExternalPdf(url: string) {
  const response = await fetch(url);
  if (!response.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  const looksLikePdf =
    bytes.length > 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46;
  if (looksLikePdf) return bytes;

  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("pdf") ? bytes : null;
}

export async function storePdfForNotificaFacil(notification: NotificaFacilNotification, html = buildNotificaFacilHtml(notification)) {
  const pdfHtml = normalizeEdpLogoSourcesForPdf(html);
  const pdf = new Uint8Array(await renderPdfFromHtml(pdfHtml));
  let pdfUrl = markPdfRoute(`/api/notifica-facil/notifications/${notification.id}/pdf`);
  let pdfBase64: string | null = Buffer.from(pdf).toString("base64");

  if (hasPersistentFileStorage()) {
    const file = await uploadFile({
      key: `notifica-facil/notifications/${PDF_RENDERER_VERSION}/${notification.id}.pdf`,
      body: pdf,
      contentType: "application/pdf"
    });
    pdfUrl = file.url;
    pdfBase64 = null;
  }

  await prisma.notificaFacilNotification.update({
    where: { id: notification.id },
    data: {
      pdf_url: pdfUrl,
      pdf_base64: pdfBase64,
      html_content: html,
      updated_date: new Date()
    }
  });

  return { bytes: pdf, url: pdfUrl, source: "generated" as const };
}

export async function ensurePdfForNotificaFacil(notification: NotificaFacilNotification): Promise<PdfCacheResult> {
  if (notification.pdf_base64 && hasCurrentPdfRenderer(notification.pdf_url)) {
    return {
      bytes: Buffer.from(notification.pdf_base64, "base64"),
      url: notification.pdf_url || markPdfRoute(`/api/notifica-facil/notifications/${notification.id}/pdf`),
      source: "database"
    };
  }

  if (isExternalPdfUrl(notification.pdf_url) && !isSelfPdfRoute(notification.pdf_url, notification.id) && hasCurrentPdfRenderer(notification.pdf_url)) {
    const bytes = await readExternalPdf(notification.pdf_url!);
    if (bytes) {
      return { bytes, url: notification.pdf_url!, source: "storage" };
    }
  }

  return storePdfForNotificaFacil(notification, sanitizeNotificaFacilHtml(notification.html_content || buildNotificaFacilHtml(notification)));
}

export { pdfResponse };
