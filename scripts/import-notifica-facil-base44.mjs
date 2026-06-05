import { Prisma, PrismaClient } from "@prisma/client";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const appId = process.env.NOTIFICA_FACIL_BASE44_APP_ID || "68ee37fd420f50f0c3ee471e";
const args = process.argv.slice(2);
const replaceExisting = args.includes("--replace");
const sourceArg = args.find((arg) => !arg.startsWith("--"));
const sourcePath = sourceArg ? path.resolve(sourceArg) : path.resolve("exports", `base44-notifica-facil-${appId}`);
const sourceInfo = await stat(sourcePath);
let consolidatedExport = null;
const importedAt = new Date();

if (sourceInfo.isFile()) {
  const parsed = JSON.parse(await readFile(sourcePath, "utf8"));
  consolidatedExport = parsed.data && typeof parsed.data === "object" ? parsed.data : parsed;
}

function dt(value) {
  if (!value) return null;
  const normalized = String(value).replace(/(\.\d{3})\d+/, "$1");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function intValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function floatValue(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolValue(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["true", "sim", "yes", "1", "x"].includes(normalized);
}

function hasTechnicalPending(row) {
  const text = `${row.status ?? ""} ${row.tipo_servico ?? ""}`.toLowerCase();
  return boolValue(row.pendencia_tecnica)
    || boolValue(row.pt_notificado)
    || Boolean(row.pt_data_notificado)
    || (text.includes("pend") && (text.includes("tecn") || text.includes("técn")));
}

function jsonValue(value) {
  return value === undefined || value === null ? Prisma.JsonNull : value;
}

function cleanValue(value) {
  if (typeof value === "string") return value.replace(/\u0000/g, "");
  if (Array.isArray(value)) return value.map(cleanValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cleanValue(item)]));
  }
  return value;
}

function pick(row, fields) {
  return Object.fromEntries(fields.map((field) => [field, row[field] ?? null]));
}

async function readJson(name) {
  if (consolidatedExport) {
    const rows = consolidatedExport[name];
    return Array.isArray(rows) ? rows.map(cleanValue) : [];
  }

  return JSON.parse(await readFile(path.join(sourcePath, `${name}.json`), "utf8")).map(cleanValue);
}

function saveRaw(entityName, row) {
  return {
    entity_name: entityName,
    base44_id: row.id,
    payload: row,
    created_date: dt(row.created_date),
    updated_date: dt(row.updated_date),
    imported_at: importedAt
  };
}

function baseFields(row) {
  return {
    created_date: dt(row.created_date),
    updated_date: dt(row.updated_date),
    created_by_id: row.created_by_id ?? null,
    created_by: row.created_by ?? null,
    is_sample: Boolean(row.is_sample)
  };
}

const notificationStringFields = [
  "tipo_servico", "numero_protocolo", "numero_notificacao", "numero_registro_censo",
  "destinatario_nome", "destinatario_cpf", "destinatario_endereco", "data_notificacao",
  "prazo_resposta", "data_email_encaminhado", "status", "pt_data_notificado", "pdf_url",
  "pdf_base64", "html_content", "regularizacao_assinada_url", "observacoes",
  "status_envio_notificacao", "vencimento_contrato", "ano_vencimento_contrato",
  "celebrado_em", "empresa_endereco", "empresa_bairro", "empresa_cidade",
  "empresa_estado", "empresa_incorporada", "contrato_numero", "ac",
  "numero_nome_empresa", "numero_parceiro", "cnpj", "texto_contrato_7_14",
  "texto_ocupacao_revelia", "texto_23_3", "texto_24_1", "texto_24_3",
  "retroativo", "ordem_venda", "censo_registro_id", "censo_draft_id",
  "numero_poste", "dados_plaqueta", "last_downloaded_by"
];

const baseNotificacaoFields = [
  "status_envio_notificacao", "vencimento_contrato", "ano_vencimento_contrato",
  "empresa_endereco", "empresa_bairro", "empresa_cidade", "empresa_estado",
  "contrato_numero", "ac", "numero_nome_empresa", "celebrado_em", "repetido_empresa",
  "repetido_endereco", "repetido_bairro", "repetido_cidade", "repetido_estado",
  "numero_parceiro", "cnpj", "texto_contrato_7_14", "texto_ocupacao_revelia",
  "texto_23_3", "texto_24_1", "texto_24_3", "valor_atualizado", "multa", "retroativo"
];

const rawEntityNames = [
  "Notification",
  "BaseNotificacao",
  "Empresa",
  "ActivityLog",
  "NotificationCounter",
  "RelatorioEmpresaClandestina",
  "Notificacao",
  "User"
];

async function createManyInBatches(model, rows, label, batchSize = 500) {
  let total = 0;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    if (batch.length === 0) continue;
    const result = await model.createMany({
      data: batch,
      skipDuplicates: true
    });
    total += result.count;
  }
  console.log(`${label}: ${total} registro(s) importados`);
}

if (replaceExisting) {
  await prisma.$transaction([
    prisma.notificaFacilRawEntity.deleteMany({ where: { entity_name: { in: rawEntityNames } } }),
    prisma.notificaFacilActivityLog.deleteMany(),
    prisma.notificaFacilNotificationCounter.deleteMany(),
    prisma.notificaFacilRelatorioEmpresaClandestina.deleteMany(),
    prisma.notificaFacilNotification.deleteMany(),
    prisma.notificaFacilBaseNotificacao.deleteMany(),
    prisma.notificaFacilEmpresa.deleteMany()
  ]);
  console.log("Registros anteriores do Notifica Facil removidos para importacao completa");
}

for (const entityName of rawEntityNames) {
  const rows = await readJson(entityName);
  await createManyInBatches(
    prisma.notificaFacilRawEntity,
    rows.filter((row) => row.id).map((row) => saveRaw(entityName, row)),
    `${entityName} bruto`
  );
}

await createManyInBatches(prisma.notificaFacilNotification, (await readJson("Notification")).map((row) => {
  return {
    id: row.id,
    ...baseFields(row),
    empresa: row.empresa || "Sem empresa",
    ...pick(row, notificationStringFields),
    valor_cobrado: floatValue(row.valor_cobrado),
    valor_atualizado: floatValue(row.valor_atualizado),
    multa: floatValue(row.multa),
    qtd_notificacoes_enviadas: intValue(row.qtd_notificacoes_enviadas),
    is_draft: boolValue(row.is_draft),
    is_standby: boolValue(row.is_standby),
    pendencia_tecnica: hasTechnicalPending(row),
    pt_notificado: boolValue(row.pt_notificado),
    mostrar_celebrado_em: row.mostrar_celebrado_em !== false,
    censo_finalizado: boolValue(row.censo_finalizado),
    total_ids_identificados: row.total_ids_identificados == null ? null : intValue(row.total_ids_identificados),
    latitude: floatValue(row.latitude),
    longitude: floatValue(row.longitude),
    download_count: intValue(row.download_count),
    last_downloaded_at: dt(row.last_downloaded_at),
    notificacao_assinada_anexos: jsonValue(row.notificacao_assinada_anexos),
    anexos_resposta_email: jsonValue(row.anexos_resposta_email),
    enderecos_revelia: jsonValue(row.enderecos_revelia),
    fotos_censo: jsonValue(row.fotos_censo),
    ocr_legendas: jsonValue(row.ocr_legendas)
  };
}), "Notification");

await createManyInBatches(prisma.notificaFacilBaseNotificacao, (await readJson("BaseNotificacao")).map((row) => {
  return {
    id: row.id,
    ...baseFields(row),
    empresa: row.empresa || "Sem empresa",
    ...pick(row, baseNotificacaoFields)
  };
}), "BaseNotificacao");

await createManyInBatches(prisma.notificaFacilEmpresa, (await readJson("Empresa")).map((row) => {
  return {
    id: row.id,
    ...baseFields(row),
    nome: row.nome || row.empresa || "Sem nome",
    cnpj: row.cnpj ?? null,
    contrato_numero: row.contrato_numero ?? null,
    endereco: row.endereco ?? null,
    cidade: row.cidade ?? null,
    estado: row.estado ?? null,
    celebrado_em: row.celebrado_em ?? null,
    tem_clausula_11_6_3: Boolean(row.tem_clausula_11_6_3),
    campo_11_6_3: row.campo_11_6_3 ?? null
  };
}), "Empresa");

await createManyInBatches(prisma.notificaFacilActivityLog, (await readJson("ActivityLog")).map((row) => {
  return {
    id: row.id,
    ...baseFields(row),
    notification_id: row.notification_id || "sem-notificacao",
    notification_number: row.notification_number ?? null,
    action: row.action || "edicao",
    field_changed: row.field_changed ?? null,
    old_value: row.old_value == null ? null : String(row.old_value),
    new_value: row.new_value == null ? null : String(row.new_value),
    user_email: row.user_email || row.created_by || "sem-email",
    user_name: row.user_name ?? null,
    timestamp: dt(row.timestamp) || dt(row.created_date) || new Date(),
    details: row.details ?? null
  };
}), "ActivityLog");

await createManyInBatches(prisma.notificaFacilNotificationCounter, (await readJson("NotificationCounter")).map((row) => {
  return {
    id: row.id,
    ...baseFields(row),
    year: String(row.year || new Date().getFullYear()),
    current: intValue(row.current)
  };
}), "NotificationCounter");

await createManyInBatches(prisma.notificaFacilRelatorioEmpresaClandestina, (await readJson("RelatorioEmpresaClandestina")).map((row) => {
  return {
    id: row.id,
    ...baseFields(row),
    empresa: row.empresa || "Sem empresa",
    numero_registro_censo: row.numero_registro_censo ?? null,
    endereco: row.endereco ?? null,
    bairro: row.bairro ?? null,
    cidade: row.cidade ?? null,
    numero_poste: row.numero_poste ?? null,
    latitude: floatValue(row.latitude),
    longitude: floatValue(row.longitude),
    fotos_censo: jsonValue(row.fotos_censo),
    motivo: row.motivo ?? null,
    status: row.status || "Pendente",
    observacoes: row.observacoes ?? null,
    data_relatorio: row.data_relatorio ?? null,
    responsaveis: row.responsaveis ?? null,
    data_envio_email: row.data_envio_email ?? null,
    censo_draft_id: row.censo_draft_id ?? null
  };
}), "RelatorioEmpresaClandestina");

console.log("Importacao do Notifica Facil concluida");
await prisma.$disconnect();
