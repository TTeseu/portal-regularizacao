import type { Notificacao } from "@prisma/client";
import PDFDocument from "pdfkit";
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

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&Aacute;/g, "Á")
    .replace(/&aacute;/g, "á")
    .replace(/&Eacute;/g, "É")
    .replace(/&eacute;/g, "é")
    .replace(/&Iacute;/g, "Í")
    .replace(/&iacute;/g, "í")
    .replace(/&Oacute;/g, "Ó")
    .replace(/&oacute;/g, "ó")
    .replace(/&Uacute;/g, "Ú")
    .replace(/&uacute;/g, "ú")
    .replace(/&Ccedil;/g, "Ç")
    .replace(/&ccedil;/g, "ç")
    .replace(/&Atilde;/g, "Ã")
    .replace(/&atilde;/g, "ã")
    .replace(/&Otilde;/g, "Õ")
    .replace(/&otilde;/g, "õ");
}

function htmlToPlainText(html: string) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|h1|h2|h3|li)>/gi, "\n\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, " | ")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function collectPdf(doc: PDFKit.PDFDocument) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on("error", reject);
    doc.end();
  });
}

export async function renderPdfFromHtml(html: string) {
  const text = htmlToPlainText(html);
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 56, right: 62, bottom: 56, left: 62 },
    bufferPages: true
  });

  doc.font("Times-Roman").fontSize(10).fillColor("#000");
  doc.text(text || "Documento sem conteúdo.", {
    align: "justify",
    lineGap: 3
  });

  return collectPdf(doc);
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
