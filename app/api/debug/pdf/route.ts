import { NextResponse } from "next/server";
import { canAccessPortal, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildPdfZip } from "@/lib/pdf-bundle";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const loteId = url.searchParams.get("lote_id") || url.searchParams.get("lote");
  console.log("[debug/pdf] lote_id:", loteId);

  if (!loteId) {
    return NextResponse.json({ success: false, error: "lote_id obrigatorio" }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    console.log("[debug/pdf] usuario:", user?.email || null);
    if (!canAccessPortal(user)) {
      return NextResponse.json({ success: false, error: "Acesso nao aprovado" }, { status: 403 });
    }

    const notificacoes = await prisma.notificacao.findMany({
      where: { OR: [{ lote_id: loteId }, { lote_nome: loteId }] },
      orderBy: { created_date: "asc" }
    });
    const ids = notificacoes.map((item) => item.id);
    console.log("[debug/pdf] lote encontrado:", ids.length > 0);
    console.log("[debug/pdf] quantidade notificacoes:", notificacoes.length);
    console.log("[debug/pdf] primeiros ids:", ids.slice(0, 5));

    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: "Lote nao encontrado", lote_id: loteId }, { status: 404 });
    }

    const zip = await buildPdfZip(notificacoes);
    console.log("[debug/pdf] zip gerado bytes:", zip.length);

    return NextResponse.json({
      success: true,
      lote_id: loteId,
      quantidade_notificacoes: notificacoes.length,
      zip_bytes: zip.length,
      primeiros_ids: ids.slice(0, 5)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[debug/pdf] erro:", { loteId, message, stack });
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
