import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { buildNotificacaoHtml } from "@/lib/notificacao-html";

export async function GET() {
  const user = await getCurrentUser();
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
        descricao: `Download de todos os ${ids.length} arquivo(s) nao arquivados`,
        quantidade_arquivos: ids.length,
        ids_baixados: ids,
        usuario_nome: user?.full_name || user?.email || "Sistema"
      }
    })
  ]);

  const body = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Todas as notificações</title><style>.doc{break-after:page;page-break-after:always}.doc:last-child{break-after:auto;page-break-after:auto}</style></head><body>${notificacoes
    .map((item) => `<section class="doc">${buildNotificacaoHtml(item)}</section>`)
    .join("")}</body></html>`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="notificacoes-todas.html"`
    }
  });
}
