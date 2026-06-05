import type { Notificacao } from "@prisma/client";
import JSZip from "jszip";
import { ensurePdfForNotificacao } from "@/lib/pdf-cache";

function safeFilename(value?: string | null) {
  return String(value || "notificacao")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "notificacao";
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function buildPdfZip(notificacoes: Notificacao[]) {
  const zip = new JSZip();

  for (let index = 0; index < notificacoes.length; index += 1) {
    const notificacao = notificacoes[index];
    const cachedPdf = await ensurePdfForNotificacao(notificacao);
    const label = safeFilename(notificacao.numero_oficio || notificacao.empresa || notificacao.id);
    zip.file(`${String(index + 1).padStart(3, "0")}-${label}.pdf`, toArrayBuffer(cachedPdf.bytes));
  }

  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

export function zipResponse(bytes: Uint8Array, filename: string) {
  return new Response(toArrayBuffer(bytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
