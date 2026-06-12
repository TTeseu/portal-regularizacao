import type { Notificacao } from "@prisma/client";
import JSZip from "jszip";
import { ensurePdfForNotificacao } from "@/lib/pdf-cache";
import { regularizacaoPdfFilename } from "@/lib/download-filename";

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function buildPdfZip(notificacoes: Notificacao[]) {
  const zip = new JSZip();

  for (let index = 0; index < notificacoes.length; index += 1) {
    const notificacao = notificacoes[index];
    const cachedPdf = await ensurePdfForNotificacao(notificacao);
    zip.file(`${String(index + 1).padStart(3, "0")} - ${regularizacaoPdfFilename(notificacao)}`, toArrayBuffer(cachedPdf.bytes));
  }

  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

export function zipResponse(bytes: Uint8Array, filename: string) {
  const asciiFilename = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
  return new Response(toArrayBuffer(bytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store"
    }
  });
}
