import type { Notificacao } from "@prisma/client";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { buildNotificacaoHtml } from "@/lib/notificacao-html";

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
  chromium.default.setGraphicsMode = false;
  const headless = "shell" as const;
  const defaultViewport = {
    deviceScaleFactor: 1,
    hasTouch: false,
    height: 1080,
    isLandscape: false,
    isMobile: false,
    width: 1440
  };
  const browser = await puppeteer.launch({
    args: await puppeteer.defaultArgs({ args: chromium.default.args, headless }),
    defaultViewport,
    executablePath: await chromium.default.executablePath(),
    headless
  });

  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.emulateMediaType("screen");
    return page.pdf({ format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }
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
  if (notificacao.pdf_base64) {
    return {
      bytes: Buffer.from(notificacao.pdf_base64, "base64"),
      url: notificacao.pdfUrl || `/api/notificacoes/${notificacao.id}/pdf`,
      source: "database"
    };
  }

  if (isExternalPdfUrl(notificacao.pdfUrl) && !isSelfPdfRoute(notificacao.pdfUrl, notificacao.id)) {
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
