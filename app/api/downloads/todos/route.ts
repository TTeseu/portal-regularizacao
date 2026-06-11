import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessPortal, getCurrentUser } from "@/lib/auth";
import { buildPdfZip, zipResponse } from "@/lib/pdf-bundle";

export async function GET() {
  const user = await getCurrentUser();
  if (!canAccessPortal(user)) return new NextResponse("Acesso não aprovado", { status: 403 });

  const notificacoes = await prisma.notificacao.findMany({
    where: { arquivada: false },
    orderBy: { created_date: "asc" }
  });
  const ids = notificacoes.map((item) => item.id);

  await prisma.$transaction([
    prisma.notificacao.updateMany({
      where: { id: { in: ids } },
      data: {
        download_count: { increment: 1 },
        last_downloaded_at: new Date(),
        last_downloaded_by: user?.full_name || user?.email || "Sistema"
      }
    }),
    prisma.historicoDownload.create({
      data: {
        id: randomUUID(),
        created_date: new Date(),
        updated_date: new Date(),
        created_by_id: user?.id,
        created_by: user?.email,
        tipo: "todos",
        descricao: `Download de todos os ${ids.length} arquivo(s) não arquivados`,
        quantidade_arquivos: ids.length,
        ids_baixados: ids,
        usuario_nome: user?.full_name || user?.email || "Sistema"
      }
    })
  ]);

  const zip = await buildPdfZip(notificacoes);
  return zipResponse(zip, "notificacoes-todas.zip");
}
