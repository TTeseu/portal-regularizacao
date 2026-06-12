import type { NotificaFacilNotification, Notificacao } from "@prisma/client";

function cleanFilenamePart(value?: string | null, fallback = "notificacao") {
  const cleaned = String(value || fallback)
    .normalize("NFC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

export function safeDownloadFilename(value: string) {
  return cleanFilenamePart(value).slice(0, 140);
}

export function regularizacaoPdfFilename(notificacao: Pick<Notificacao, "empresa" | "numero_oficio" | "id">) {
  const empresa = cleanFilenamePart(notificacao.empresa, "Empresa").slice(0, 90);
  const numero = cleanFilenamePart(notificacao.numero_oficio, notificacao.id).slice(0, 40);
  return `${safeDownloadFilename(`${empresa} - ${numero}`)}.pdf`;
}

export function notificaFacilPdfFilename(notification: Pick<NotificaFacilNotification, "empresa" | "numero_notificacao" | "numero_registro_censo" | "id">) {
  const empresa = cleanFilenamePart(notification.empresa, "Empresa").slice(0, 90);
  const numero = cleanFilenamePart(notification.numero_notificacao || notification.numero_registro_censo, notification.id).slice(0, 40);
  return `${safeDownloadFilename(`${empresa} - ${numero}`)}.pdf`;
}
