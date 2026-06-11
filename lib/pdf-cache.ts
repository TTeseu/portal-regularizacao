import type { Notificacao } from "@prisma/client";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { buildNotificacaoHtml, sanitizeNotificacaoHtml } from "@/lib/notificacao-html";

type PdfCacheResult = {
  bytes: Uint8Array;
  url: string;
  source: "blob" | "database" | "generated";
};

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function isExternalPdfUrl(value?: string | null) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function isSelfPdfRoute(value?: string | null, id?: string) {
  if (!value) return false;
  return value.includes(`/api/notificacoes/${id}/pdf`);
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function renderPdfFromHtml(html: string) {
  const chromium = await import("@sparticuz/chromium");
  const puppeteer = await import("puppeteer-core");
  const browser = await puppeteer.launch({
    args: chromium.default.args,
    executablePath: await chromium.default.executablePath(),
    headless: true
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    return page.pdf({ format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }
}

async function readExternalPdf(url: string) {
  const response = await fetch(url);
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("pdf")) return null;
  return new Uint8Array(await response.arrayBuffer());
}

export async function storePdfForNotificacao(notificacao: Notificacao, html = buildNotificacaoHtml(notificacao)) {
  const pdf = new Uint8Array(await renderPdfFromHtml(html));
  let pdfUrl = `/api/notificacoes/${notificacao.id}/pdf`;
  let pdfBase64: string | null = Buffer.from(pdf).toString("base64");

  if (hasBlobToken()) {
    const blob = await put(`regularizacao/notificacoes/${notificacao.id}.pdf`, Buffer.from(pdf), {
      access: "public",
      contentType: "application/pdf",
      allowOverwrite: true
    });
    pdfUrl = blob.url;
    pdfBase64 = null;
  }

  await prisma.notificacao.update({
    where: { id: notificacao.id },
    data: {
      pdfUrl,
      pdf_base64: pdfBase64,
      html_content: html,
      updated_date: new Date()
    }
  });

  return { bytes: pdf, url: pdfUrl, source: "generated" as const };
}

export async function ensurePdfForNotificacao(notificacao: Notificacao): Promise<PdfCacheResult> {
  const needsTemplateRefresh = Boolean(
    notificacao.html_content && sanitizeNotificacaoHtml(notificacao.html_content) !== notificacao.html_content
  );

  if (!needsTemplateRefresh && notificacao.pdf_base64) {
    return {
      bytes: Buffer.from(notificacao.pdf_base64, "base64"),
      url: notificacao.pdfUrl || `/api/notificacoes/${notificacao.id}/pdf`,
      source: "database"
    };
  }

  if (!needsTemplateRefresh && isExternalPdfUrl(notificacao.pdfUrl) && !isSelfPdfRoute(notificacao.pdfUrl, notificacao.id)) {
    const bytes = await readExternalPdf(notificacao.pdfUrl!);
    if (bytes) {
      return {
        bytes,
        url: notificacao.pdfUrl!,
        source: "blob"
      };
    }
  }

  return storePdfForNotificacao(notificacao);
}

export function pdfResponse(bytes: Uint8Array, filename: string) {
  return new Response(toArrayBuffer(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=31536000, immutable"
    }
  });
}
