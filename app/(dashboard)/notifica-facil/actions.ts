"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { canEdit, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildNotificaFacilHtml } from "@/lib/notifica-facil-html";
import { storePdfForNotificaFacil } from "@/lib/notifica-facil-pdf-cache";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) || "").trim();
  return value || null;
}

function numberValue(formData: FormData, key: string) {
  const raw = String(formData.get(key) || "").replace(",", ".").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function parseEnderecos(value: string | null): Prisma.JsonArray | undefined {
  if (!value) return undefined;
  const rows = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [endereco = "", bairro = "", cidade = ""] = line.split(";").map((part) => part.trim());
      return { endereco, bairro, cidade };
    });
  return rows.length ? rows : undefined;
}

function parseAnexos(value: string | null): Prisma.JsonArray | undefined {
  if (!value) return undefined;
  const rows = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [nome = "", url = ""] = line.split(";").map((part) => part.trim());
      return { nome, url };
    });
  return rows.length ? rows : undefined;
}

function formToData(formData: FormData): Prisma.NotificaFacilNotificationUncheckedCreateInput {
  return {
    id: randomUUID(),
    created_date: new Date(),
    updated_date: new Date(),
    empresa: String(formData.get("empresa") || "").trim(),
    tipo_servico: text(formData, "tipo_servico"),
    numero_protocolo: text(formData, "numero_protocolo"),
    numero_notificacao: text(formData, "numero_notificacao"),
    numero_registro_censo: text(formData, "numero_registro_censo"),
    destinatario_nome: text(formData, "destinatario_nome"),
    destinatario_cpf: text(formData, "destinatario_cpf"),
    destinatario_endereco: text(formData, "destinatario_endereco"),
    valor_cobrado: numberValue(formData, "valor_cobrado"),
    data_notificacao: text(formData, "data_notificacao"),
    prazo_resposta: text(formData, "prazo_resposta"),
    data_email_encaminhado: text(formData, "data_email_encaminhado"),
    status: text(formData, "status") || "Aguardando assinatura Gestor",
    is_draft: checked(formData, "is_draft"),
    is_standby: checked(formData, "is_standby"),
    pendencia_tecnica: checked(formData, "pendencia_tecnica"),
    pt_notificado: checked(formData, "pt_notificado"),
    cnpj: text(formData, "cnpj"),
    contrato_numero: text(formData, "contrato_numero"),
    ac: text(formData, "ac"),
    numero_parceiro: text(formData, "numero_parceiro"),
    empresa_endereco: text(formData, "empresa_endereco"),
    empresa_bairro: text(formData, "empresa_bairro"),
    empresa_cidade: text(formData, "empresa_cidade"),
    empresa_estado: text(formData, "empresa_estado"),
    ordem_venda: text(formData, "ordem_venda"),
    texto_contrato_7_14: text(formData, "texto_contrato_7_14"),
    texto_ocupacao_revelia: text(formData, "texto_ocupacao_revelia"),
    enderecos_revelia: parseEnderecos(text(formData, "enderecos_revelia")),
    anexos_resposta_email: parseAnexos(text(formData, "anexos_resposta_email")),
    observacoes: text(formData, "observacoes")
  };
}

async function logAction(notificationId: string, action: string, details?: string) {
  const user = await requireUser();
  await prisma.notificaFacilActivityLog.create({
    data: {
      id: randomUUID(),
      created_date: new Date(),
      updated_date: new Date(),
      notification_id: notificationId,
      action,
      user_email: user.email,
      user_name: user.full_name || user.name || user.email,
      timestamp: new Date(),
      details
    }
  });
}

export async function createNotificaFacilNotification(formData: FormData) {
  const user = await requireUser();
  if (!canEdit(user)) redirect("/notifica-facil");

  const data = formToData(formData);
  data.created_by_id = user.id;
  data.created_by = user.email;

  const created = await prisma.notificaFacilNotification.create({ data });
  await storePdfForNotificaFacil(created, buildNotificaFacilHtml(created));
  await logAction(created.id, "criacao", "Notificacao criada no modulo Notifica Facil");

  revalidatePath("/notifica-facil");
  redirect(`/notifica-facil/${created.id}`);
}

export async function updateNotificaFacilNotification(id: string, formData: FormData) {
  const user = await requireUser();
  if (!canEdit(user)) redirect(`/notifica-facil/${id}`);

  const updateData = { ...formToData(formData) } as Prisma.NotificaFacilNotificationUncheckedUpdateInput;
  delete updateData.id;
  delete updateData.created_date;
  delete updateData.created_by;
  delete updateData.created_by_id;

  const updated = await prisma.notificaFacilNotification.update({
    where: { id },
    data: {
      ...updateData,
      pdf_url: null,
      pdf_base64: null,
      html_content: null,
      updated_date: new Date()
    }
  });

  await storePdfForNotificaFacil(updated, buildNotificaFacilHtml(updated));
  await logAction(id, "edicao", "Notificacao editada e PDF regenerado");

  revalidatePath("/notifica-facil");
  revalidatePath(`/notifica-facil/${id}`);
  redirect(`/notifica-facil/${id}`);
}

export async function deleteNotificaFacilNotification(id: string) {
  const user = await requireUser();
  if (!canEdit(user)) redirect(`/notifica-facil/${id}`);
  await prisma.notificaFacilNotification.delete({ where: { id } });
  await logAction(id, "exclusao", "Notificacao excluida no modulo Notifica Facil");
  revalidatePath("/notifica-facil");
  redirect("/notifica-facil");
}
