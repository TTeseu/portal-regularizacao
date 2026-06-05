import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessPortal, getCurrentUser } from "@/lib/auth";
import { buildPdfZip, zipResponse } from "@/lib/pdf-bundle";

export async function POST(request: Request) {
  const formData = await request.formData();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const user = await getCurrentUser();
  if (!canAccessPortal(user)) return new NextResponse("Acesso nao aprovado", { status: 403 });
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

  const zip = await buildPdfZip(notificacoes);
  return zipResponse(zip, "notificacoes-selecao.zip");
}
