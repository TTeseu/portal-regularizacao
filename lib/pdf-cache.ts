import type { Notificacao } from "@prisma/client";
import { existsSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { buildNotificacaoHtml } from "@/lib/notificacao-html";

export const PDF_RENDERER_VERSION = "html-render-v2";

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

export function hasCurrentPdfRenderer(value?: string | null) {
  return Boolean(value?.includes(PDF_RENDERER_VERSION));
}

export function markPdfRoute(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}renderer=${PDF_RENDERER_VERSION}`;
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function getChromeExecutablePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter(Boolean) as string[];

  const localPath = candidates.find((path) => existsSync(path));
  if (localPath) return localPath;

  return chromium.executablePath();
}

export async function renderPdfFromHtml(html: string) {
  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      "--disable-web-security",
      "--font-render-hinting=none"
    ],
    defaultViewport: { width: 1280, height: 1600 },
    executablePath: await getChromeExecutablePath(),
    headless: true
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images)
          .filter((image) => !image.complete)
          .map((image) => new Promise((resolve) => {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", resolve, { once: true });
          }))
      );
    });
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true
    });
    return new Uint8Array(pdf);
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
  let pdfUrl = markPdfRoute(`/api/notificacoes/${notificacao.id}/pdf`);
  let pdfBase64: string | null = Buffer.from(pdf).toString("base64");

  if (hasBlobToken()) {
    const blob = await put(`regularizacao/notificacoes/${PDF_RENDERER_VERSION}/${notificacao.id}.pdf`, Buffer.from(pdf), {
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
  if (notificacao.pdf_base64 && hasCurrentPdfRenderer(notificacao.pdfUrl)) {
    return {
      bytes: Buffer.from(notificacao.pdf_base64, "base64"),
      url: notificacao.pdfUrl || markPdfRoute(`/api/notificacoes/${notificacao.id}/pdf`),
      source: "database"
    };
  }

  if (isExternalPdfUrl(notificacao.pdfUrl) && !isSelfPdfRoute(notificacao.pdfUrl, notificacao.id) && hasCurrentPdfRenderer(notificacao.pdfUrl)) {
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
