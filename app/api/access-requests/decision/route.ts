import { NextResponse } from "next/server";
import { verifyAccessDecisionToken } from "@/lib/access-request-token";
import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/super-admin";

export const dynamic = "force-dynamic";

function htmlPage(title: string, message: string, tone: "success" | "danger" | "neutral" = "neutral") {
  const colors = {
    success: { icon: "#00E676", bg: "rgba(0,230,118,.12)" },
    danger: { icon: "#F87171", bg: "rgba(248,113,113,.12)" },
    neutral: { icon: "#C7D0DA", bg: "rgba(255,255,255,.08)" }
  }[tone];

  return new NextResponse(`<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
      </head>
      <body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#1E2D44;font-family:Inter,Arial,sans-serif;color:#fff">
        <main style="width:min(92vw,560px);text-align:center;background:#263A57;border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:36px;box-shadow:0 24px 70px rgba(0,0,0,.28)">
          <div style="width:72px;height:72px;margin:0 auto 22px;display:grid;place-items:center;border-radius:20px;background:${colors.bg};color:${colors.icon};font-size:22px;font-weight:900">OK</div>
          <h1 style="margin:0;font-size:28px;line-height:1.2">${title}</h1>
          <p style="margin:16px 0 0;color:#C7D0DA;line-height:1.7">${message}</p>
          <a href="/" style="display:inline-block;margin-top:28px;background:#00E676;color:#061427;text-decoration:none;font-weight:800;border-radius:14px;padding:13px 18px">Abrir portal</a>
        </main>
      </body>
    </html>`, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const payload = verifyAccessDecisionToken(url.searchParams.get("token"));

  if (!payload) {
    return htmlPage("Link invalido ou expirado", "Solicite o reenvio do pedido de acesso pelo painel administrativo.", "danger");
  }

  const user = await prisma.user.findFirst({
    where: {
      id: payload.userId,
      email: { equals: payload.email, mode: "insensitive" }
    }
  });

  if (!user) {
    return htmlPage("Usuario nao encontrado", "O pedido de acesso nao foi localizado no banco de dados.", "danger");
  }

  if (payload.action === "approve") {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: isSuperAdminEmail(user.email) ? "admin" : user.role,
        status: "approved",
        accessApproved: true,
        pode_editar_importar: isSuperAdminEmail(user.email) ? true : user.pode_editar_importar,
        approvedAt: new Date(),
        approvedBy: "email-link",
        rejectedAt: null,
        rejectedBy: null
      }
    });

    return htmlPage("Acesso aprovado", `O usuario ${user.email} ja pode acessar o Portal de Notificacoes EDP.`, "success");
  }

  if (isSuperAdminEmail(user.email)) {
    return htmlPage("Acao bloqueada", "O administrador principal nao pode ser recusado.", "danger");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: "rejected",
      accessApproved: false,
      rejectedAt: new Date(),
      rejectedBy: "email-link"
    }
  });

  return htmlPage("Acesso negado", `O usuario ${user.email} foi marcado como acesso recusado.`, "danger");
}
