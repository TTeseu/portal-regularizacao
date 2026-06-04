import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { buildNotificacaoHtml } from "@/lib/notificacao-html";

function bundleHtml(items: Array<{ id: string; html: string }>) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Notificações</title><style>.doc{break-after:page;page-break-after:always}.doc:last-child{break-after:auto;page-break-after:auto}</style></head><body>${items
    .map((item) => `<section class="doc" data-id="${item.id}">${item.html}</section>`)
    .join("")}</body></html>`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const user = await getCurrentUser();
  if (ids.length === 0) return NextResponse.redirect(new URL("/notificacoes", request.url), 303);

  const notificacoes = await prisma.notificacao.findMany({ where: { id: { in: ids } } });
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
        tipo: "selecao",
        descricao: `Download de ${ids.length} arquivo(s) por selecao`,
        quantidade_arquivos: ids.length,
        ids_baixados: ids,
        usuario_nome: user?.full_name || user?.email || "Sistema"
      }
    })
  ]);

  return new NextResponse(
    bundleHtml(notificacoes.map((item) => ({ id: item.id, html: buildNotificacaoHtml(item) }))),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="notificacoes-selecao.html"`
      }
    }
  );
}
