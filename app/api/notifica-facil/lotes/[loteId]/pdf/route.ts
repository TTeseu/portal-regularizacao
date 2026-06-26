import { NextResponse } from "next/server";
import { canAccessPortal, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildNotificaFacilPdfZip, zipResponse } from "@/lib/pdf-bundle";
import { safeDownloadFilename } from "@/lib/download-filename";
import { formatDate } from "@/lib/format";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ loteId: string }> }
) {
  const [{ loteId }, user] = await Promise.all([params, getCurrentUser()]);
  const decodedLoteId = decodeURIComponent(loteId || "").trim();

  if (!canAccessPortal(user)) return new NextResponse("Acesso nao aprovado", { status: 403 });
  if (!decodedLoteId) return new NextResponse("lote_id obrigatorio", { status: 400 });

  try {
    const notificacoes = await prisma.notificaFacilNotification.findMany({
      where: {
        numero_notificacao: { not: null },
        OR: [{ lote_id: decodedLoteId }, { lote_nome: decodedLoteId }]
      },
      orderBy: [{ created_date: "asc" }, { id: "asc" }]
    });

    if (!notificacoes.length) return new NextResponse("Lote nao encontrado", { status: 404 });

    await prisma.notificaFacilNotification.updateMany({
      where: { id: { in: notificacoes.map((item) => item.id) } },
      data: {
        download_count: { increment: 1 },
        last_downloaded_at: new Date(),
        last_downloaded_by: user?.full_name || user?.email || "Sistema"
      }
    });

    const zip = await buildNotificaFacilPdfZip(notificacoes);
    const first = notificacoes[0];
    const numero = first?.numero_notificacao || first?.numero_registro_censo || first?.lote_id || decodedLoteId;
    const loteNome = `${numero} - ${formatDate(first?.data_notificacao || first?.updated_date || first?.created_date)}`;

    return zipResponse(zip, `${safeDownloadFilename(`notifica-facil-lote-${loteNome}`)}.zip`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[notifica-facil/lotes/pdf] erro:", { loteId: decodedLoteId, message, stack });
    return NextResponse.json({ success: false, error: message, stack, lote_id: decodedLoteId }, { status: 500 });
  }
}
