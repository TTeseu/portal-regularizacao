import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessPortal, getCurrentUser } from "@/lib/auth";
import { ensurePdfForNotificacao, pdfResponse } from "@/lib/pdf-cache";
import { regularizacaoPdfFilename } from "@/lib/download-filename";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!canAccessPortal(user)) return new NextResponse("Acesso não aprovado", { status: 403 });
  const notificacao = await prisma.notificacao.findUnique({ where: { id } });
  if (!notificacao) return new NextResponse("Notificação não encontrada", { status: 404 });
  const cachedPdf = await ensurePdfForNotificacao(notificacao);

  await prisma.$transaction([
    prisma.notificacao.update({
      where: { id },
      data: {
        download_count: { increment: 1 },
        last_downloaded_at: new Date(),
        last_downloaded_by: user?.full_name || user?.email || "Sistema",
        pdfUrl: cachedPdf.url
      }
    }),
    prisma.historicoDownload.create({
      data: {
        id: randomUUID(),
        created_date: new Date(),
        updated_date: new Date(),
        created_by_id: user?.id,
        created_by: user?.email,
        tipo: "selecao",
        descricao: `Download individual da notificação ${notificacao.numero_oficio || id}`,
        quantidade_arquivos: 1,
        ids_baixados: [id],
        usuario_nome: user?.full_name || user?.email || "Sistema"
      }
    })
  ]);

  return pdfResponse(cachedPdf.bytes, regularizacaoPdfFilename(notificacao));
}
