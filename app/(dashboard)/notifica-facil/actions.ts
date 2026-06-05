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
  const raw = String(formData.get(key) || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
    .trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function intValue(formData: FormData, key: string) {
  const raw = String(formData.get(key) || "").trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function parseRegNumber(value: string | null | undefined) {
  const match = String(value || "").match(/^REG(\d+)\/(\d{4})$/i);
  if (!match) return null;
  return { sequence: Number(match[1]), year: match[2] };
}

function yearFromDateText(value: string | null | undefined) {
  const clean = String(value || "").trim();
  const iso = clean.match(/^(\d{4})-\d{2}-\d{2}$/);
  if (iso) return iso[1];
  const br = clean.match(/^\d{2}\/\d{2}\/(\d{4})$/);
  if (br) return br[1];
  return String(new Date().getFullYear());
}

function formatRegNumber(sequence: number, year: string) {
  return `REG${String(sequence).padStart(4, "0")}/${year}`;
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
    qtd_notificacoes_enviadas: intValue(formData, "qtd_notificacoes_enviadas") ?? 0,
    status: text(formData, "status") || "Aguardando assinatura Gestor",
    is_draft: checked(formData, "is_draft"),
    is_standby: checked(formData, "is_standby"),
    pendencia_tecnica: checked(formData, "pendencia_tecnica"),
    pt_notificado: checked(formData, "pt_notificado"),
    pt_data_notificado: text(formData, "pt_data_notificado"),
    status_envio_notificacao: text(formData, "status_envio_notificacao"),
    vencimento_contrato: text(formData, "vencimento_contrato"),
    ano_vencimento_contrato: text(formData, "ano_vencimento_contrato"),
    celebrado_em: text(formData, "celebrado_em"),
    mostrar_celebrado_em: checked(formData, "mostrar_celebrado_em"),
    cnpj: text(formData, "cnpj"),
    contrato_numero: text(formData, "contrato_numero"),
    ac: text(formData, "ac"),
    numero_nome_empresa: text(formData, "numero_nome_empresa"),
    numero_parceiro: text(formData, "numero_parceiro"),
    empresa_endereco: text(formData, "empresa_endereco"),
    empresa_bairro: text(formData, "empresa_bairro"),
    empresa_cidade: text(formData, "empresa_cidade"),
    empresa_estado: text(formData, "empresa_estado"),
    empresa_incorporada: text(formData, "empresa_incorporada"),
    ordem_venda: text(formData, "ordem_venda"),
    texto_contrato_7_14: text(formData, "texto_contrato_7_14"),
    texto_ocupacao_revelia: text(formData, "texto_ocupacao_revelia"),
    texto_23_3: text(formData, "texto_23_3"),
    texto_24_1: text(formData, "texto_24_1"),
    texto_24_3: text(formData, "texto_24_3"),
    valor_atualizado: numberValue(formData, "valor_atualizado"),
    multa: numberValue(formData, "multa"),
    retroativo: text(formData, "retroativo"),
    enderecos_revelia: parseEnderecos(text(formData, "enderecos_revelia")),
    total_ids_identificados: intValue(formData, "total_ids_identificados"),
    anexos_resposta_email: parseAnexos(text(formData, "anexos_resposta_email")),
    observacoes: text(formData, "observacoes")
  };
}

async function generateNextNotificationNumber(tx: Prisma.TransactionClient, year: string) {
  const yearNumber = Number.parseInt(year, 10) || new Date().getFullYear();
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(680037, ${yearNumber})`;

  const [existing, counter] = await Promise.all([
    tx.notificaFacilNotification.findMany({
      where: { numero_notificacao: { endsWith: `/${year}` } },
      select: { numero_notificacao: true }
    }),
    tx.notificaFacilNotificationCounter.findUnique({ where: { year } })
  ]);

  const maxExisting = existing.reduce((max, item) => {
    const parsed = parseRegNumber(item.numero_notificacao);
    if (!parsed || parsed.year !== year) return max;
    return Math.max(max, parsed.sequence);
  }, 0);
  const next = Math.max(maxExisting, counter?.current ?? 0) + 1;

  await tx.notificaFacilNotificationCounter.upsert({
    where: { year },
    create: {
      id: randomUUID(),
      created_date: new Date(),
      updated_date: new Date(),
      year,
      current: next
    },
    update: {
      updated_date: new Date(),
      current: next
    }
  });

  return formatRegNumber(next, year);
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

  const created = await prisma.$transaction(async (tx) => {
    const year = yearFromDateText(data.data_notificacao);
    data.numero_notificacao = await generateNextNotificationNumber(tx, year);
    return tx.notificaFacilNotification.create({ data });
  });
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

export async function markNotificaFacilPtNotificado(id: string) {
  const user = await requireUser();
  if (!canEdit(user)) redirect("/notifica-facil/pendencia-tecnica");

  const today = new Date().toISOString().slice(0, 10);
  await prisma.notificaFacilNotification.update({
    where: { id },
    data: {
      pendencia_tecnica: true,
      pt_notificado: true,
      pt_data_notificado: today,
      updated_date: new Date()
    }
  });

  await logAction(id, "pendencia_tecnica", "PT marcado como notificado");
  revalidatePath("/notifica-facil");
  revalidatePath("/notifica-facil/pendencia-tecnica");
  revalidatePath("/notifica-facil/historico-pendencia-tecnica");
  revalidatePath("/notifica-facil/notificacao-pendencias");
  redirect("/notifica-facil/pendencia-tecnica");
}
