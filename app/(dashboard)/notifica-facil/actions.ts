"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { canEdit, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildNotificacaoHtml } from "@/lib/notificacao-html";
import { buildNotificaFacilHtml } from "@/lib/notifica-facil-html";
import { storePdfForNotificaFacil } from "@/lib/notifica-facil-pdf-cache";
import { requireFormattedCNPJ } from "@/lib/cnpj";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) || "").trim();
  return value || null;
}

function cnpjText(formData: FormData, key = "cnpj") {
  return requireFormattedCNPJ(text(formData, key));
}

function numberValue(formData: FormData, key: string) {
  return numberFromText(String(formData.get(key) || ""));
}

function numberFromText(value: string | number | null | undefined) {
  const raw = String(value || "")
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

function dateFromInput(value: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function pluralLabel(count: number) {
  return count === 1 ? "notificação" : "notificações";
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

function parseEnderecosWizard(formData: FormData) {
  const raw = text(formData, "enderecos_json");
  if (!raw) return { jsonText: null, jsonArray: undefined, count: 0 };
  try {
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) return { jsonText: null, jsonArray: undefined, count: 0 };
    const normalized = rows
      .map((row) => ({
        endereco: String(row?.endereco ?? "").trim(),
        bairro: String(row?.bairro ?? "").trim(),
        cidade: String(row?.cidade ?? "").trim()
      }))
      .filter((row) => row.endereco || row.bairro || row.cidade);
    return {
      jsonText: normalized.length ? JSON.stringify(normalized) : null,
      jsonArray: normalized.length ? (normalized as Prisma.JsonArray) : undefined,
      count: normalized.length
    };
  } catch {
    return { jsonText: null, jsonArray: undefined, count: 0 };
  }
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
    cnpj: cnpjText(formData),
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
  await logAction(created.id, "criacao", "Notificação criada no módulo Notifica Fácil");

  revalidatePath("/notifica-facil");
  redirect(`/notifica-facil/${created.id}`);
}

export async function createNotificaFacilPendenciaWizard(formData: FormData) {
  const user = await requireUser();
  if (!canEdit(user)) redirect("/notifica-facil/notificacao-pendencias");

  const empresaIds = formData.getAll("empresa_ids").map(String).filter(Boolean);
  if (empresaIds.length === 0) {
    throw new Error("Selecione ao menos uma empresa.");
  }

  const empresas = await prisma.notificaFacilBaseNotificacao.findMany({
    where: { id: { in: empresaIds } },
    orderBy: { empresa: "asc" }
  });

  if (empresas.length === 0) {
    throw new Error("Nenhuma empresa selecionada foi encontrada na base do Notifica Fácil.");
  }

  const now = new Date();
  const loteId = randomUUID();
  const loteNome = text(formData, "lote_nome") || `Notifica Fácil - ${now.toLocaleDateString("pt-BR")} - ${empresas.length} ${pluralLabel(empresas.length)}`;
  const tipo = text(formData, "tipo_notificacao") || "Ocupação Irregular";
  const numeroOficio = text(formData, "numero_oficio");
  const dataNotificacao = dateFromInput(text(formData, "data_notificacao"));
  const prazoDias = text(formData, "prazo_dias");
  const enderecos = parseEnderecosWizard(formData);
  const createdIds: string[] = [];

  for (const empresa of empresas) {
    const id = randomUUID();
    const notificationNumber = numeroOficio || await prisma.$transaction((tx) =>
      generateNextNotificationNumber(tx, yearFromDateText(dataNotificacao))
    );

    const data: Prisma.NotificaFacilNotificationUncheckedCreateInput = {
      id,
      created_date: now,
      updated_date: now,
      created_by_id: user.id,
      created_by: user.email,
      empresa: empresa.empresa,
      tipo_servico: tipo,
      numero_notificacao: notificationNumber,
      data_notificacao: dataNotificacao,
      prazo_resposta: prazoDias,
      status: "Aguardando assinatura Gestor",
      pendencia_tecnica: true,
      pt_notificado: false,
      status_envio_notificacao: empresa.status_envio_notificacao,
      vencimento_contrato: empresa.vencimento_contrato,
      ano_vencimento_contrato: empresa.ano_vencimento_contrato,
      celebrado_em: empresa.celebrado_em,
      cnpj: requireFormattedCNPJ(empresa.cnpj),
      contrato_numero: empresa.contrato_numero,
      ac: empresa.ac,
      numero_nome_empresa: empresa.numero_nome_empresa,
      numero_parceiro: empresa.numero_parceiro,
      empresa_endereco: empresa.empresa_endereco,
      empresa_bairro: empresa.empresa_bairro,
      empresa_cidade: empresa.empresa_cidade,
      empresa_estado: empresa.empresa_estado,
      texto_contrato_7_14: empresa.texto_contrato_7_14,
      texto_ocupacao_revelia: empresa.texto_ocupacao_revelia,
      texto_23_3: empresa.texto_23_3,
      texto_24_1: empresa.texto_24_1,
      texto_24_3: empresa.texto_24_3,
      valor_atualizado: numberFromText(empresa.valor_atualizado),
      multa: numberFromText(empresa.multa),
      retroativo: empresa.retroativo,
      enderecos_revelia: enderecos.jsonArray,
      total_ids_identificados: enderecos.count,
      observacoes: loteNome
    };

    const created = await prisma.notificaFacilNotification.create({ data });
    const portalTemplateHtml = buildNotificacaoHtml({
      id,
      created_date: now,
      updated_date: now,
      created_by_id: user.id,
      created_by: user.email,
      is_sample: false,
      tipo_notificacao: tipo,
      numero_oficio: notificationNumber,
      data_notificacao: dataNotificacao,
      nota_atendimento: null,
      empresa: empresa.empresa,
      status_envio: null,
      vencimento: empresa.vencimento_contrato,
      ano_vencimento: empresa.ano_vencimento_contrato,
      endereco: empresa.empresa_endereco,
      bairro: empresa.empresa_bairro,
      cidade: empresa.empresa_cidade,
      estado: empresa.empresa_estado,
      contrato_numero: empresa.contrato_numero,
      ac: empresa.ac,
      numero_nome: empresa.numero_nome_empresa,
      celebrado_em: empresa.celebrado_em,
      numero_parceiro: empresa.numero_parceiro,
      cnpj: requireFormattedCNPJ(empresa.cnpj),
      empresa_rep: null,
      endereco_rep: null,
      bairro_rep: null,
      cidade_rep: null,
      estado_rep: null,
      campo_11_6_3: null,
      empresa_1: null,
      rua_empresa_1: null,
      cidade_empresa_1: null,
      estado_empresa_1: null,
      cnpj_empresa_1: null,
      numero_contrato_1: null,
      empresa_2: null,
      endereco_empresa_2: null,
      cnpj_empresa_2: null,
      numero_contrato_2: null,
      endereco_notificacao: enderecos.jsonText,
      razao_social_condominio: null,
      endereco_condominio: null,
      cidade_condominio: null,
      estado_condominio: null,
      cnpj_condominio: null,
      condominio_identificado: null,
      data_reuniao: null,
      prazo_dias: prazoDias,
      prazo_resposta: prazoDias,
      lote_nome: loteNome,
      lote_id: loteId,
      pdf_base64: null,
      pdfUrl: null,
      html_content: null,
      status: "Pendente",
      observacoes: null,
      retorno_cliente: null,
      anexo_url: null,
      anexo_nome: null,
      anexos: null,
      origem: "manual",
      visualizada: false,
      arquivada: false,
      sem_projeto: false,
      encaminhado_prefeitura: false,
      download_count: 0,
      last_downloaded_at: null,
      last_downloaded_by: null
    });
    await storePdfForNotificaFacil(created, portalTemplateHtml);
    await logAction(created.id, "criacao_pendencia", "Notificação das Pendências criada com o template do Portal de Regularização");
    createdIds.push(id);
  }

  revalidatePath("/notifica-facil");
  revalidatePath("/notifica-facil/notificacao-pendencias");
  if (createdIds.length === 1) {
    redirect(`/notifica-facil/${createdIds[0]}`);
  }
  redirect("/notifica-facil/notificacao-pendencias");
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
  await logAction(id, "edicao", "Notificação editada e PDF regenerado");

  revalidatePath("/notifica-facil");
  revalidatePath(`/notifica-facil/${id}`);
  redirect(`/notifica-facil/${id}`);
}

export async function deleteNotificaFacilNotification(id: string) {
  const user = await requireUser();
  if (!canEdit(user)) redirect(`/notifica-facil/${id}`);
  await prisma.notificaFacilNotification.delete({ where: { id } });
  await logAction(id, "exclusao", "Notificação excluída no módulo Notifica Fácil");
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
