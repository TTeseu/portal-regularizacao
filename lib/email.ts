import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { createAccessDecisionToken } from "@/lib/access-request-token";
import { getSuperAdminEmails } from "@/lib/super-admin";

type AccessRequestUser = {
  id?: string | null;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  requestedAt?: Date | null;
};

function sender() {
  return process.env.EMAIL_FROM || process.env.SMTP_USER || "Portal de Regularização <no-reply@portal-regularizacao.local>";
}

function appUrl() {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://portal-regularizacao.vercel.app";
}

async function sendViaResend(to: string[], subject: string, text: string, html?: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: sender(),
      to,
      subject,
      text,
      ...(html ? { html } : {})
    })
  });

  if (!response.ok) {
    throw new Error(`Resend retornou ${response.status}`);
  }
}

async function sendViaSmtp(to: string[], subject: string, text: string, html?: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    } : undefined
  });

  await transporter.sendMail({
    from: sender(),
    to,
    subject,
    text,
    html
  });
}

function escapeHtml(value?: string | null) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function notifyAdminsNewAccessRequest(user: AccessRequestUser) {
  const target = user.id ? user : user.email ? await prisma.user.findFirst({
    where: { email: { equals: user.email, mode: "insensitive" } },
    select: { id: true, email: true, name: true, full_name: true, requestedAt: true }
  }) : null;

  const admins = await prisma.user.findMany({
    where: {
      role: "admin",
      status: "approved",
      accessApproved: true
    },
    select: { email: true }
  });
  const recipients = Array.from(new Set([
    ...admins.map((admin) => admin.email),
    ...getSuperAdminEmails()
  ].filter(Boolean)));

  if (recipients.length === 0) return;

  const requestedAt = user.requestedAt || target?.requestedAt || new Date();
  const targetId = target?.id || user.id;
  const targetEmail = target?.email || user.email || "";
  const targetName = target?.name || target?.full_name || user.name;
  const approveUrl = targetId && targetEmail ? `${appUrl()}/api/access-requests/decision?token=${createAccessDecisionToken({
    userId: targetId,
    email: targetEmail,
    action: "approve"
  })}` : `${appUrl()}/usuarios`;
  const rejectUrl = targetId && targetEmail ? `${appUrl()}/api/access-requests/decision?token=${createAccessDecisionToken({
    userId: targetId,
    email: targetEmail,
    action: "reject"
  })}` : `${appUrl()}/usuarios`;
  const subject = "Novo pedido de acesso - Portal de Regularização";
  const text = [
    "Um novo usuario solicitou acesso ao sistema.",
    "",
    `Nome: ${targetName || user.name || "-"}`,
    `E-mail: ${targetEmail || user.email || "-"}`,
    `Data: ${requestedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
    "",
    `Permitir acesso: ${approveUrl}`,
    `Negar acesso: ${rejectUrl}`,
    "",
    "Os links expiram automaticamente."
  ].join("\n");
  const html = `
    <div style="margin:0;background:#f4f7fa;padding:28px;font-family:Inter,Arial,sans-serif;color:#172033">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
        <div style="background:#1E2D44;padding:24px 28px;color:#ffffff">
          <div style="font-size:13px;font-weight:700;color:#00E676;text-transform:uppercase;letter-spacing:.04em">Portal de Regularização</div>
          <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25">Novo pedido de acesso</h1>
        </div>
        <div style="padding:28px">
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155">Um novo usuario solicitou acesso ao sistema.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin-bottom:22px">
            <div style="font-size:13px;color:#64748B">Nome</div>
            <div style="font-size:16px;font-weight:700;color:#172033">${escapeHtml(targetName || user.name || "-")}</div>
            <div style="height:12px"></div>
            <div style="font-size:13px;color:#64748B">E-mail</div>
            <div style="font-size:16px;font-weight:700;color:#172033">${escapeHtml(targetEmail || user.email || "-")}</div>
            <div style="height:12px"></div>
            <div style="font-size:13px;color:#64748B">Data</div>
            <div style="font-size:16px;font-weight:700;color:#172033">${escapeHtml(requestedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }))}</div>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <a href="${approveUrl}" style="display:inline-block;background:#00E676;color:#061427;text-decoration:none;font-weight:800;border-radius:12px;padding:13px 18px">Permitir acesso</a>
            <a href="${rejectUrl}" style="display:inline-block;background:#fee2e2;color:#991b1b;text-decoration:none;font-weight:800;border-radius:12px;padding:13px 18px">Negar acesso</a>
          </div>
          <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#64748B">Esses links sao seguros, assinados pelo sistema e expiram automaticamente. Tambem e possivel aprovar ou recusar pelo painel de usuarios.</p>
        </div>
      </div>
    </div>
  `;

  try {
    if (process.env.RESEND_API_KEY) {
      await sendViaResend(recipients, subject, text, html);
      return;
    }
    if (process.env.SMTP_HOST) {
      await sendViaSmtp(recipients, subject, text, html);
      return;
    }
    console.warn("Envio de email de acesso nao configurado. Defina RESEND_API_KEY ou SMTP_HOST.");
  } catch (error) {
    console.error("Falha ao enviar email de pedido de acesso:", error);
  }
}
