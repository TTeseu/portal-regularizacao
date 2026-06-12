import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessPortal, getCurrentUser } from "@/lib/auth";
import { buildPdfZip, zipResponse } from "@/lib/pdf-bundle";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const loteId = url.searchParams.get("lote_id") || url.searchParams.get("lote");
  console.log("[downloads/lote] lote_id:", loteId);

  if (!loteId) return new NextResponse("lote_id obrigatorio", { status: 400 });

  try {
    const user = await getCurrentUser();
    console.log("[downloads/lote] usuario:", user?.email || null);
    if (!canAccessPortal(user)) return new NextResponse("Acesso nao aprovado", { status: 403 });

    const notificacoes = await prisma.notificacao.findMany({
      where: { OR: [{ lote_id: loteId }, { lote_nome: loteId }] },
      orderBy: { created_date: "asc" }
    });
    const ids = notificacoes.map((item) => item.id);
    console.log("[downloads/lote] lote encontrado:", ids.length > 0);
    console.log("[downloads/lote] quantidade notificacoes:", notificacoes.length);
    console.log("[downloads/lote] primeiros ids:", ids.slice(0, 5));

    if (ids.length === 0) return new NextResponse("Lote nao encontrado", { status: 404 });

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
          tipo: "lote",
          descricao: `Download de ${ids.length} arquivo(s) do lote ${loteId}`,
          quantidade_arquivos: ids.length,
          ids_baixados: ids,
          usuario_nome: user?.full_name || user?.email || "Sistema"
        }
      })
    ]);

    console.log("[downloads/lote] iniciando buildPdfZip");
    const zip = await buildPdfZip(notificacoes);
    console.log("[downloads/lote] zip gerado bytes:", zip.length);

    return zipResponse(zip, `lote-${loteId}.zip`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[downloads/lote] erro:", { loteId, message, stack });
    return NextResponse.json(
      {
        success: false,
        error: message,
        stack,
        lote_id: loteId
      },
      { status: 500 }
    );
  }
}
