import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const sourceDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve("exports", `base44-${process.env.BASE44_APP_ID || "690248a304b1770ec9b7c4ed"}`);

function dt(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function intValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function pick(row, fields) {
  return Object.fromEntries(fields.map((field) => [field, row[field] ?? null]));
}

function formatCNPJ(value, label = "CNPJ") {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length !== 14) throw new Error(`${label} inválido.`);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

function normalizeCNPJFields(data, fields, rowId) {
  for (const field of fields) {
    if (field in data) data[field] = formatCNPJ(data[field], `${field} do registro ${rowId || "sem id"}`);
  }
  return data;
}

async function readJson(name) {
  return JSON.parse(await readFile(path.join(sourceDir, `${name}.json`), "utf8"));
}

const notificacaoFields = [
  "tipo_notificacao", "numero_oficio", "data_notificacao", "nota_atendimento", "empresa",
  "status_envio", "vencimento", "ano_vencimento", "endereco", "bairro", "cidade", "estado",
  "contrato_numero", "ac", "numero_nome", "celebrado_em", "numero_parceiro", "cnpj",
  "empresa_rep", "endereco_rep", "bairro_rep", "cidade_rep", "estado_rep", "campo_11_6_3",
  "empresa_1", "rua_empresa_1", "cidade_empresa_1", "estado_empresa_1", "cnpj_empresa_1",
  "numero_contrato_1", "empresa_2", "endereco_empresa_2", "cnpj_empresa_2", "numero_contrato_2",
  "endereco_notificacao", "razao_social_condominio", "endereco_condominio", "cidade_condominio",
  "estado_condominio", "cnpj_condominio", "condominio_identificado", "data_reuniao", "prazo_dias",
  "prazo_resposta", "lote_nome", "lote_id", "pdf_base64", "pdfUrl", "html_content", "status",
  "observacoes", "retorno_cliente", "anexo_url", "anexo_nome", "origem", "last_downloaded_by"
];

const empresas = await readJson("Empresa");
for (const row of empresas) {
  const formattedCNPJ = formatCNPJ(row.cnpj, `cnpj da empresa ${row.id || row.nome || "sem id"}`);
  await prisma.empresa.upsert({
    where: { id: row.id },
    update: {
      created_date: dt(row.created_date),
      updated_date: dt(row.updated_date),
      created_by_id: row.created_by_id ?? null,
      created_by: row.created_by ?? null,
      is_sample: Boolean(row.is_sample),
      nome: row.nome || "Sem nome",
      cnpj: formattedCNPJ,
      contrato_numero: row.contrato_numero ?? null,
      endereco: row.endereco ?? null,
      cidade: row.cidade ?? null,
      estado: row.estado ?? null,
      celebrado_em: row.celebrado_em ?? null,
      tem_clausula_11_6_3: Boolean(row.tem_clausula_11_6_3),
      campo_11_6_3: row.campo_11_6_3 ?? null
    },
    create: {
      id: row.id,
      created_date: dt(row.created_date),
      updated_date: dt(row.updated_date),
      created_by_id: row.created_by_id ?? null,
      created_by: row.created_by ?? null,
      is_sample: Boolean(row.is_sample),
      nome: row.nome || "Sem nome",
      cnpj: formattedCNPJ,
      contrato_numero: row.contrato_numero ?? null,
      endereco: row.endereco ?? null,
      cidade: row.cidade ?? null,
      estado: row.estado ?? null,
      celebrado_em: row.celebrado_em ?? null,
      tem_clausula_11_6_3: Boolean(row.tem_clausula_11_6_3),
      campo_11_6_3: row.campo_11_6_3 ?? null
    }
  });
}

const users = await readJson("User");
for (const row of users) {
  await prisma.user.upsert({
    where: { email: row.email },
    update: {
      id: row.id,
      created_date: dt(row.created_date),
      updated_date: dt(row.updated_date),
      full_name: row.full_name ?? null,
      role: row.role || "user",
      pode_editar_importar: Boolean(row.pode_editar_importar)
    },
    create: {
      id: row.id,
      created_date: dt(row.created_date),
      updated_date: dt(row.updated_date),
      full_name: row.full_name ?? null,
      email: row.email,
      role: row.role || "user",
      pode_editar_importar: Boolean(row.pode_editar_importar)
    }
  });
}

const notificacoes = await readJson("Notificacao");
for (const row of notificacoes) {
  const common = {
    created_date: dt(row.created_date),
    updated_date: dt(row.updated_date),
    created_by_id: row.created_by_id ?? null,
    created_by: row.created_by ?? null,
    is_sample: Boolean(row.is_sample),
    ...pick(row, notificacaoFields),
    anexos: row.anexos ?? undefined,
    visualizada: Boolean(row.visualizada),
    arquivada: Boolean(row.arquivada),
    sem_projeto: Boolean(row.sem_projeto),
    encaminhado_prefeitura: Boolean(row.encaminhado_prefeitura),
    download_count: intValue(row.download_count),
    last_downloaded_at: dt(row.last_downloaded_at)
  };
  normalizeCNPJFields(common, ["cnpj", "cnpj_empresa_1", "cnpj_empresa_2", "cnpj_condominio"], row.id);
  await prisma.notificacao.upsert({
    where: { id: row.id },
    update: common,
    create: { id: row.id, ...common }
  });
}

const historicos = await readJson("HistoricoDownload");
for (const row of historicos) {
  const common = {
    created_date: dt(row.created_date),
    updated_date: dt(row.updated_date),
    created_by_id: row.created_by_id ?? null,
    created_by: row.created_by ?? null,
    is_sample: Boolean(row.is_sample),
    tipo: row.tipo || "selecao",
    descricao: row.descricao || "",
    quantidade_arquivos: intValue(row.quantidade_arquivos),
    ids_baixados: Array.isArray(row.ids_baixados) ? row.ids_baixados.map(String) : [],
    usuario_nome: row.usuario_nome ?? null
  };
  await prisma.historicoDownload.upsert({
    where: { id: row.id },
    update: common,
    create: { id: row.id, ...common }
  });
}

console.log("Importacao concluida");
await prisma.$disconnect();
