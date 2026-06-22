"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { canEdit, requireUser } from "@/lib/auth";
import { activeCensoWhere } from "@/lib/notifica-facil-censo";
import { prisma } from "@/lib/prisma";
import { buildNotificacaoHtml } from "@/lib/notificacao-html";
import { buildNotificaFacilHtml } from "@/lib/notifica-facil-html";
import { storePdfForNotificaFacil } from "@/lib/notifica-facil-pdf-cache";
import { requireFormattedCNPJ } from "@/lib/cnpj";
import { BR_TIME_ZONE } from "@/lib/format";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) || "").trim();
  return value || null;
}

function cnpjText(formData: FormData, key = "cnpj") {
  return requireFormattedCNPJ(text(formData, key));
}

function formattedCNPJOrNull(value: string | null | undefined) {
  return value ? requireFormattedCNPJ(value) : null;
}

function withFlash(path: string, params: Record<string, string | number | null | undefined>) {
  const [pathname, query = ""] = path.split("?");
  const search = new URLSearchParams(query);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") search.set(key, String(value));
  }
  const nextQuery = search.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
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

function dateFromBrText(value: string | null | undefined) {
  const raw = String(value || "").trim();
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return new Date(`${br[3]}-${br[2]}-${br[1]}T12:00:00.000-03:00`);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00.000-03:00`);
  return new Date();
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
      const [endereco = "", bairro = "", cidade = "", quantidadePostes = ""] = line.split(";").map((part) => part.trim());
      const quantidade = Number.parseInt(quantidadePostes.replace(/\D/g, ""), 10);
      return {
        endereco,
        bairro,
        cidade,
        quantidade_postes: Number.isFinite(quantidade) && quantidade > 0 ? quantidade : null
      };
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

function parseDelimitedCsv(textValue: string) {
  const normalized = textValue.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLine = normalized.split("\n")[0] || "";
  const delimiter = (firstLine.match(/;/g)?.length || 0) >= (firstLine.match(/,/g)?.length || 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" && !quoted) {
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  const [headers = [], ...dataRows] = rows;
  return dataRows.map((values) => {
    const entry: Record<string, string> = {};
    headers.forEach((header, index) => {
      entry[header.trim()] = String(values[index] || "").trim();
    });
    return entry;
  });
}

function csvKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function firstCsvValue(row: Record<string, string>, names: string[]) {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [csvKey(key), value]));
  for (const name of names) {
    const value = normalized.get(csvKey(name));
    if (value) return value;
  }
  return null;
}

function photosFromCsvRow(row: Record<string, string>) {
  const values = Object.entries(row)
    .filter(([key]) => /foto|imagem|anexo|evidencia|arquivo|url/i.test(key.normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
    .flatMap(([, value]) => String(value || "").split(/[\n,|]+/))
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//i.test(value));
  return Array.from(new Set(values));
}

function parseCoordinate(value: string | null, axis: "lat" | "lng") {
  const raw = String(value || "");
  const label = axis === "lat" ? /lat(?:itude)?\s*[:=]?\s*(-?\d+(?:[.,]\d+)?)/i : /(?:lng|lon|longitude)\s*[:=]?\s*(-?\d+(?:[.,]\d+)?)/i;
  const labeled = raw.match(label)?.[1];
  const numbers = raw.match(/-?\d+(?:[.,]\d+)?/g) || [];
  const picked = labeled || numbers[axis === "lat" ? 0 : 1];
  if (!picked) return null;
  const parsed = Number(picked.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function isFinalCensoStatus(status: string | null) {
  const normalized = String(status || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return normalized.includes("finaliz") || normalized.includes("exclu") || normalized.includes("clandest");
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
    quantidade_postes: intValue(formData, "quantidade_postes"),
    quantidade_postes_regularizados: intValue(formData, "quantidade_postes_regularizados"),
    anexos_resposta_email: parseAnexos(text(formData, "anexos_resposta_email")),
    observacoes: text(formData, "observacoes")
  };
}

async function generateNextNotificationNumber(tx: Prisma.TransactionClient, year: string) {
  const yearNumber = Number.parseInt(year, 10) || new Date().getFullYear();
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(680037::integer, ${yearNumber}::integer)`;

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

  const linkedCensoIds = formData.getAll("censo_ids").map(String).map((id) => id.trim()).filter(Boolean);
  const data = formToData(formData);
  data.created_by_id = user.id;
  data.created_by = user.email;

  const created = await prisma.$transaction(async (tx) => {
    const year = yearFromDateText(data.data_notificacao);
    data.numero_notificacao = await generateNextNotificationNumber(tx, year);
    const notification = await tx.notificaFacilNotification.create({ data });
    if (linkedCensoIds.length) {
      await tx.notificaFacilNotification.updateMany({
        where: { AND: [activeCensoWhere, { id: { in: linkedCensoIds } }] },
        data: {
          censo_finalizado: true,
          censo_draft_id: notification.id,
          status: "Finalizado",
          status_envio_notificacao: "Finalizado - notificacao gerada",
          updated_date: new Date()
        }
      });
    }
    return notification;
  });
  await storePdfForNotificaFacil(created, buildNotificaFacilHtml(created));
  await logAction(created.id, "criacao", "Notificação criada no módulo Notifica Fácil");

  revalidatePath("/notifica-facil");
  revalidatePath("/notifica-facil/importar-censo");
  revalidatePath("/notifica-facil/historico-censo");
  redirect(withFlash("/notifica-facil", { success: "notificacao-gerada", count: 1 }));
}

export async function prepareNotificaFacilFromCenso(formData: FormData) {
  const user = await requireUser();
  if (!canEdit(user)) redirect("/notifica-facil/importar-censo");

  const ids = Array.from(new Set(formData.getAll("censo_ids").map(String).map((id) => id.trim()).filter(Boolean)));
  if (!ids.length) redirect("/notifica-facil/importar-censo?erro=selecao");

  const selected = await prisma.notificaFacilNotification.findMany({
    where: { AND: [activeCensoWhere, { id: { in: ids } }] },
    select: { id: true, empresa: true }
  });
  if (!selected.length) redirect("/notifica-facil/importar-censo?erro=selecao");

  const companies = new Set(selected.map((item) => String(item.empresa || "").trim().toLowerCase()).filter(Boolean));
  if (companies.size !== 1 || selected.length !== ids.length) {
    redirect("/notifica-facil/importar-censo?erro=empresas");
  }

  redirect(`/notifica-facil/nova?censo=${encodeURIComponent(ids.join(","))}`);
}

function selectedCensoIds(formData: FormData) {
  return Array.from(new Set(formData.getAll("censo_ids").map(String).map((id) => id.trim()).filter(Boolean)));
}

async function moveCensosToHistory(ids: string[], status: string, statusEnvio: string) {
  if (!ids.length) redirect("/notifica-facil/importar-censo?erro=selecao");

  const result = await prisma.notificaFacilNotification.updateMany({
    where: { AND: [activeCensoWhere, { id: { in: ids } }] },
    data: {
      censo_finalizado: true,
      status,
      status_envio_notificacao: statusEnvio,
      updated_date: new Date()
    }
  });

  revalidatePath("/notifica-facil");
  revalidatePath("/notifica-facil/importar-censo");
  revalidatePath("/notifica-facil/historico-censo");
  return result.count;
}

export async function finalizeSelectedNotificaFacilCensos(formData: FormData) {
  const user = await requireUser();
  if (!canEdit(user)) redirect("/notifica-facil/importar-censo");

  const count = await moveCensosToHistory(selectedCensoIds(formData), "Finalizado", "Finalizado manualmente");
  redirect(withFlash("/notifica-facil/importar-censo", { success: "censos-historico", count }));
}

export async function markSelectedNotificaFacilCensosClandestino(formData: FormData) {
  const user = await requireUser();
  if (!canEdit(user)) redirect("/notifica-facil/importar-censo");

  const count = await moveCensosToHistory(selectedCensoIds(formData), "Clandestino", "Marcado como clandestino");
  redirect(withFlash("/notifica-facil/importar-censo", { success: "censos-clandestinos", count }));
}

export async function finalizeOneNotificaFacilCenso(id: string) {
  const user = await requireUser();
  if (!canEdit(user)) redirect("/notifica-facil/importar-censo");

  const count = await moveCensosToHistory([id], "Finalizado", "Finalizado manualmente");
  redirect(withFlash("/notifica-facil/importar-censo", { success: "censos-historico", count }));
}

export async function markOneNotificaFacilCensoClandestino(id: string) {
  const user = await requireUser();
  if (!canEdit(user)) redirect("/notifica-facil/importar-censo");

  const count = await moveCensosToHistory([id], "Clandestino", "Marcado como clandestino");
  redirect(withFlash("/notifica-facil/importar-censo", { success: "censos-clandestinos", count }));
}

export async function importNotificaFacilCensoCsv(formData: FormData) {
  const user = await requireUser();
  if (!canEdit(user)) redirect("/notifica-facil/importar-censo");

  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/notifica-facil/importar-censo?erro=arquivo");
  }

  const rows = parseDelimitedCsv(await file.text());
  const normalized = rows
    .map((row) => {
      const registro = firstCsvValue(row, ["Nº Registro CENSO", "N Registro CENSO", "Nº Registro", "Numero Registro", "Registro", "numero_registro_censo"]);
      const status = firstCsvValue(row, ["Status", "Status Banco"]) || "Recebido do COLETA DE DADOS";
      const coordenadas = firstCsvValue(row, ["Coordenadas", "Coordenadas pelas fotos"]);
      const dataText = firstCsvValue(row, ["Data", "Data Censo", "Criado em"]);
      const fotos = photosFromCsvRow(row);
      return {
        id: randomUUID(),
        created_date: dateFromBrText(dataText),
        updated_date: new Date(),
        created_by_id: user.id,
        created_by: user.email,
        empresa: firstCsvValue(row, ["Empresa"]) || "SEM PLAQUETA",
        tipo_servico: "CENSO",
        numero_registro_censo: registro,
        data_notificacao: dataText,
        status,
        censo_finalizado: isFinalCensoStatus(status),
        censo_registro_id: registro,
        empresa_incorporada: firstCsvValue(row, ["Empresa Incorporada"]),
        empresa_endereco: firstCsvValue(row, ["Endereço", "Endereco"]),
        empresa_bairro: firstCsvValue(row, ["Bairro"]),
        empresa_cidade: firstCsvValue(row, ["Cidade", "Município", "Municipio"]),
        numero_poste: firstCsvValue(row, ["Nº Poste", "N Poste", "Numero Poste", "Poste"]),
        latitude: parseCoordinate(firstCsvValue(row, ["Latitude"]) || coordenadas, "lat"),
        longitude: parseCoordinate(firstCsvValue(row, ["Longitude"]) || coordenadas, "lng"),
        fotos_censo: fotos.length ? fotos : undefined,
        observacoes: firstCsvValue(row, ["Observação", "Observacao", "Observações", "Observacoes"]),
        ordem_venda: firstCsvValue(row, ["Ordem de Venda", "OV", "Nº OV"]),
        status_envio_notificacao: status
      } satisfies Prisma.NotificaFacilNotificationUncheckedCreateInput;
    })
    .filter((row) => row.numero_registro_censo);

  const uniqueRows = Array.from(new Map(normalized.map((row) => [row.numero_registro_censo, row])).values());
  const existing = await prisma.notificaFacilNotification.findMany({
    where: { numero_registro_censo: { in: uniqueRows.map((row) => row.numero_registro_censo).filter(Boolean) as string[] } },
    select: { numero_registro_censo: true }
  });
  const existingSet = new Set(existing.map((row) => row.numero_registro_censo).filter(Boolean));
  const toCreate = uniqueRows.filter((row) => row.numero_registro_censo && !existingSet.has(row.numero_registro_censo));

  for (let index = 0; index < toCreate.length; index += 500) {
    const batch = toCreate.slice(index, index + 500);
    if (batch.length) {
      await prisma.notificaFacilNotification.createMany({ data: batch, skipDuplicates: true });
      await prisma.notificaFacilRawEntity.createMany({
        data: batch.map((row) => ({
          entity_name: row.censo_finalizado ? "HistoricoCensoCsv" : "ImportarCensoCsv",
          base44_id: row.numero_registro_censo || row.id,
          payload: JSON.parse(JSON.stringify(row)) as Prisma.InputJsonValue,
          created_date: row.created_date,
          updated_date: row.updated_date
        })),
        skipDuplicates: true
      });
    }
  }

  revalidatePath("/notifica-facil");
  revalidatePath("/notifica-facil/importar-censo");
  revalidatePath("/notifica-facil/historico-censo");
  redirect(`/notifica-facil/importar-censo?importados=${toCreate.length}&ignorados=${uniqueRows.length - toCreate.length}`);
}

export async function updateNotificaFacilCensoRegistro(id: string, formData: FormData) {
  const user = await requireUser();
  if (!canEdit(user)) redirect("/notifica-facil/importar-censo");

  await prisma.notificaFacilNotification.update({
    where: { id },
    data: {
      empresa: text(formData, "empresa") || "SEM PLAQUETA",
      empresa_incorporada: text(formData, "empresa_incorporada"),
      empresa_endereco: text(formData, "empresa_endereco"),
      empresa_bairro: text(formData, "empresa_bairro"),
      empresa_cidade: text(formData, "empresa_cidade"),
      numero_poste: text(formData, "numero_poste"),
      status: text(formData, "status") || "Recebido do COLETA DE DADOS",
      status_envio_notificacao: text(formData, "status"),
      observacoes: text(formData, "observacoes"),
      ordem_venda: text(formData, "ordem_venda"),
      censo_finalizado: isFinalCensoStatus(text(formData, "status")),
      updated_date: new Date()
    }
  });

  revalidatePath("/notifica-facil");
  revalidatePath("/notifica-facil/importar-censo");
  revalidatePath("/notifica-facil/historico-censo");
  redirect(withFlash("/notifica-facil/importar-censo", { success: "salvo" }));
}

export async function clearNotificaFacilCensoObservacoes() {
  const user = await requireUser();
  if (!canEdit(user)) redirect("/notifica-facil/importar-censo");

  await prisma.notificaFacilNotification.updateMany({
    where: activeCensoWhere,
    data: { observacoes: null, updated_date: new Date() }
  });

  revalidatePath("/notifica-facil/importar-censo");
  redirect(withFlash("/notifica-facil/importar-censo", { success: "salvo" }));
}

export async function createNotificaFacilPendenciaWizard(formData: FormData) {
  const user = await requireUser();
  if (!canEdit(user)) redirect("/notifica-facil/notificacao-pendencias");

  const empresaIds = formData.getAll("empresa_ids").map(String).filter(Boolean);
  if (empresaIds.length === 0) {
    throw new Error("Selecione ao menos uma empresa.");
  }

  const empresas = await prisma.empresa.findMany({
    where: { id: { in: empresaIds } },
    orderBy: { nome: "asc" }
  });

  if (empresas.length === 0) {
    throw new Error("Nenhuma empresa selecionada foi encontrada na base do Notifica Fácil.");
  }

  const now = new Date();
  const loteId = randomUUID();
  const loteNome = text(formData, "lote_nome") || `Notifica Fácil - ${now.toLocaleDateString("pt-BR", { timeZone: BR_TIME_ZONE })} - ${empresas.length} ${pluralLabel(empresas.length)}`;
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
      empresa: empresa.nome,
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
      cnpj: formattedCNPJOrNull(empresa.cnpj),
      contrato_numero: empresa.contrato_numero,
      ac: empresa.ac,
      numero_nome_empresa: empresa.numero_nome_empresa,
      numero_parceiro: empresa.numero_parceiro,
      empresa_endereco: empresa.endereco,
      empresa_bairro: empresa.bairro,
      empresa_cidade: empresa.cidade,
      empresa_estado: empresa.estado,
      empresa_incorporada: empresa.empresa_incorporada,
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
      empresa: empresa.nome,
      status_envio: null,
      vencimento: empresa.vencimento_contrato,
      ano_vencimento: empresa.ano_vencimento_contrato,
      endereco: empresa.endereco,
      bairro: empresa.bairro,
      cidade: empresa.cidade,
      estado: empresa.estado,
      contrato_numero: empresa.contrato_numero,
      ac: empresa.ac,
      numero_nome: empresa.numero_nome_empresa,
      celebrado_em: empresa.celebrado_em,
      numero_parceiro: empresa.numero_parceiro,
      cnpj: formattedCNPJOrNull(empresa.cnpj),
      empresa_rep: null,
      endereco_rep: null,
      bairro_rep: null,
      cidade_rep: null,
      estado_rep: null,
      campo_11_6_3: empresa.tem_clausula_11_6_3 ? empresa.campo_11_6_3 : null,
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
  redirect(withFlash("/notifica-facil/notificacao-pendencias", { success: "notificacoes-geradas", count: createdIds.length }));
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
  redirect(withFlash(`/notifica-facil/${id}`, { success: "salvo" }));
}

export async function deleteNotificaFacilNotification(id: string) {
  const user = await requireUser();
  if (!canEdit(user)) redirect(`/notifica-facil/${id}`);
  await prisma.notificaFacilNotification.delete({ where: { id } });
  await logAction(id, "exclusao", "Notificação excluída no módulo Notifica Fácil");
  revalidatePath("/notifica-facil");
  redirect(withFlash("/notifica-facil", { success: "notificacao-excluida" }));
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
  redirect(withFlash("/notifica-facil/pendencia-tecnica", { success: "salvo" }));
}
