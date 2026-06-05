import { Prisma, PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const appId = process.env.NOTIFICA_FACIL_BASE44_APP_ID || "68ee37fd420f50f0c3ee471e";
const sourceDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve("exports", `base44-notifica-facil-${appId}`);

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

function jsonValue(value) {
  return value === undefined || value === null ? Prisma.JsonNull : value;
}

function pick(row, fields) {
  return Object.fromEntries(fields.map((field) => [field, row[field] ?? null]));
}

async function readJson(name) {
  return JSON.parse(await readFile(path.join(sourceDir, `${name}.json`), "utf8"));
}

async function saveRaw(entityName, row) {
  await prisma.notificaFacilRawEntity.upsert({
    where: { entity_name_base44_id: { entity_name: entityName, base44_id: row.id } },
    update: {
      payload: row,
      created_date: dt(row.created_date),
      updated_date: dt(row.updated_date),
      imported_at: new Date()
    },
    create: {
      entity_name: entityName,
      base44_id: row.id,
      payload: row,
      created_date: dt(row.created_date),
      updated_date: dt(row.updated_date)
    }
  });
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

for (const entityName of [
  "Notification",
  "BaseNotificacao",
  "Empresa",
  "ActivityLog",
  "NotificationCounter",
  "RelatorioEmpresaClandestina",
  "Notificacao"
]) {
  const rows = await readJson(entityName);
  for (const row of rows) {
    await saveRaw(entityName, row);
  }
  console.log(`${entityName}: ${rows.length} registro(s) brutos preservados`);
}

for (const row of await readJson("Notification")) {
  const common = {
    ...baseFields(row),
    empresa: row.empresa || "Sem empresa",
    ...pick(row, notificationStringFields),
    valor_cobrado: floatValue(row.valor_cobrado),
    valor_atualizado: floatValue(row.valor_atualizado),
    multa: floatValue(row.multa),
    qtd_notificacoes_enviadas: intValue(row.qtd_notificacoes_enviadas),
    is_draft: Boolean(row.is_draft),
    is_standby: Boolean(row.is_standby),
    pendencia_tecnica: Boolean(row.pendencia_tecnica),
    pt_notificado: Boolean(row.pt_notificado),
    mostrar_celebrado_em: row.mostrar_celebrado_em !== false,
    censo_finalizado: Boolean(row.censo_finalizado),
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

  await prisma.notificaFacilNotification.upsert({
    where: { id: row.id },
    update: common,
    create: { id: row.id, ...common }
  });
}

for (const row of await readJson("BaseNotificacao")) {
  const common = {
    ...baseFields(row),
    empresa: row.empresa || "Sem empresa",
    ...pick(row, baseNotificacaoFields)
  };
  await prisma.notificaFacilBaseNotificacao.upsert({
    where: { id: row.id },
    update: common,
    create: { id: row.id, ...common }
  });
}

for (const row of await readJson("Empresa")) {
  const common = {
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
  await prisma.notificaFacilEmpresa.upsert({
    where: { id: row.id },
    update: common,
    create: { id: row.id, ...common }
  });
}

for (const row of await readJson("ActivityLog")) {
  const common = {
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
  await prisma.notificaFacilActivityLog.upsert({
    where: { id: row.id },
    update: common,
    create: { id: row.id, ...common }
  });
}

for (const row of await readJson("NotificationCounter")) {
  const common = {
    ...baseFields(row),
    year: String(row.year || new Date().getFullYear()),
    current: intValue(row.current)
  };
  await prisma.notificaFacilNotificationCounter.upsert({
    where: { year: common.year },
    update: common,
    create: { id: row.id, ...common }
  });
}

for (const row of await readJson("RelatorioEmpresaClandestina")) {
  const common = {
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
  await prisma.notificaFacilRelatorioEmpresaClandestina.upsert({
    where: { id: row.id },
    update: common,
    create: { id: row.id, ...common }
  });
}

console.log("Importacao do Notifica Facil concluida");
await prisma.$disconnect();
