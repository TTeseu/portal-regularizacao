import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { getSuperAdminEmails } from "@/lib/super-admin";

type AccessRequestUser = {
  name?: string | null;
  email?: string | null;
  requestedAt?: Date | null;
};

function sender() {
  return process.env.EMAIL_FROM || process.env.SMTP_USER || "Portal de Regularizacao <no-reply@portal-regularizacao.local>";
}

async function sendViaResend(to: string[], subject: string, text: string) {
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
      text
    })
  });

  if (!response.ok) {
    throw new Error(`Resend retornou ${response.status}`);
  }
}

async function sendViaSmtp(to: string[], subject: string, text: string) {
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
    text
  });
}

export async function notifyAdminsNewAccessRequest(user: AccessRequestUser) {
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

  const requestedAt = user.requestedAt || new Date();
  const subject = "Novo pedido de acesso - Portal de Regularizacao";
  const text = [
    "Um novo usuario solicitou acesso ao sistema.",
    "",
    `Nome: ${user.name || "-"}`,
    `E-mail: ${user.email || "-"}`,
    `Data: ${requestedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
    "",
    "Acesse o painel administrativo para aprovar ou recusar."
  ].join("\n");

  try {
    if (process.env.RESEND_API_KEY) {
      await sendViaResend(recipients, subject, text);
      return;
    }
    if (process.env.SMTP_HOST) {
      await sendViaSmtp(recipients, subject, text);
      return;
    }
    console.warn("Envio de email de acesso nao configurado. Defina RESEND_API_KEY ou SMTP_HOST.");
  } catch (error) {
    console.error("Falha ao enviar email de pedido de acesso:", error);
  }
}
