import { NextResponse } from "next/server";
import { canAccessPortal, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensurePdfForNotificaFacil, pdfResponse } from "@/lib/notifica-facil-pdf-cache";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  if (!canAccessPortal(user)) return new NextResponse("Acesso não aprovado", { status: 403 });

  const notification = await prisma.notificaFacilNotification.findUnique({ where: { id } });
  if (!notification) return new NextResponse("Notificação não encontrada", { status: 404 });

  await prisma.notificaFacilNotification.update({
    where: { id },
    data: {
      download_count: { increment: 1 },
      last_downloaded_at: new Date(),
      last_downloaded_by: user?.full_name || user?.email || "Sistema"
    }
  });

  const cached = await ensurePdfForNotificaFacil(notification);
  const filename = `${notification.numero_notificacao || notification.numero_registro_censo || notification.id}.pdf`;
  return pdfResponse(cached.bytes, filename);
}
