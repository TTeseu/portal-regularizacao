import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessPortal, getCurrentUser } from "@/lib/auth";
import { buildNotificacaoHtml } from "@/lib/notificacao-html";

async function renderPdf(html: string) {
  try {
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");
    const browser = await puppeteer.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();
    return pdf;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!canAccessPortal(user)) return new NextResponse("Acesso nao aprovado", { status: 403 });
  const notificacao = await prisma.notificacao.findUnique({ where: { id } });
  if (!notificacao) return new NextResponse("Notificacao nao encontrada", { status: 404 });

  const html = buildNotificacaoHtml(notificacao);
  const pdf = await renderPdf(html);

  await prisma.$transaction([
    prisma.notificacao.update({
      where: { id },
      data: {
        download_count: { increment: 1 },
        last_downloaded_at: new Date(),
        last_downloaded_by: user?.full_name || user?.email || "Sistema",
        pdfUrl: `/api/notificacoes/${id}/pdf`
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
        descricao: `Download PDF da notificacao ${notificacao.numero_oficio || id}`,
        quantidade_arquivos: 1,
        ids_baixados: [id],
        usuario_nome: user?.full_name || user?.email || "Sistema"
      }
    })
  ]);

  if (!pdf) {
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="notificacao-${id}.html"`
      }
    });
  }

  const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="notificacao-${id}.pdf"`
    }
  });
}
