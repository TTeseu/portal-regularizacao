import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatCNPJ(value) {
  const clean = digits(value);
  if (clean.length !== 14) return null;
  return clean
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function compactData(data) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

async function findEmpresa(row, cnpj) {
  if (row.contrato_numero) {
    const byContract = await prisma.empresa.findFirst({ where: { contrato_numero: row.contrato_numero } });
    if (byContract) return byContract;
  }
  if (cnpj) {
    const byCnpj = await prisma.empresa.findFirst({ where: { cnpj } });
    if (byCnpj) return byCnpj;
  }
  return prisma.empresa.findFirst({ where: { nome: { equals: row.empresa, mode: "insensitive" } } });
}

const baseRows = await prisma.notificaFacilBaseNotificacao.findMany({ orderBy: { empresa: "asc" } });
let baseCnpjCorrigidos = 0;
let baseCnpjInvalidosRemovidos = 0;
let empresasCriadas = 0;
let empresasAtualizadas = 0;
let notificacoesCorrigidas = 0;

for (const row of baseRows) {
  const cnpj = formatCNPJ(row.cnpj) || formatCNPJ(row.numero_parceiro);

  if (cnpj && row.cnpj !== cnpj) {
    await prisma.notificaFacilBaseNotificacao.update({
      where: { id: row.id },
      data: { cnpj, updated_date: new Date() }
    });
    baseCnpjCorrigidos += 1;
  } else if (!cnpj && row.cnpj) {
    await prisma.notificaFacilBaseNotificacao.update({
      where: { id: row.id },
      data: { cnpj: null, updated_date: new Date() }
    });
    baseCnpjInvalidosRemovidos += 1;
  }

  const empresaData = compactData({
    updated_date: new Date(),
    nome: row.empresa || "Sem nome",
    cnpj,
    contrato_numero: row.contrato_numero || undefined,
    endereco: row.empresa_endereco || undefined,
    bairro: row.empresa_bairro || undefined,
    cidade: row.empresa_cidade || undefined,
    estado: row.empresa_estado || undefined,
    celebrado_em: row.celebrado_em || undefined,
    numero_parceiro: row.numero_parceiro || undefined,
    status_envio_notificacao: row.status_envio_notificacao || undefined,
    vencimento_contrato: row.vencimento_contrato || undefined,
    ano_vencimento_contrato: row.ano_vencimento_contrato || undefined,
    ac: row.ac || undefined,
    numero_nome_empresa: row.numero_nome_empresa || undefined,
    texto_contrato_7_14: row.texto_contrato_7_14 || undefined,
    texto_ocupacao_revelia: row.texto_ocupacao_revelia || undefined,
    texto_23_3: row.texto_23_3 || undefined,
    texto_24_1: row.texto_24_1 || undefined,
    texto_24_3: row.texto_24_3 || undefined,
    valor_atualizado: row.valor_atualizado || undefined,
    multa: row.multa || undefined,
    retroativo: row.retroativo || undefined
  });

  const existing = await findEmpresa(row, cnpj);
  if (existing) {
    await prisma.empresa.update({
      where: { id: existing.id },
      data: empresaData
    });
    empresasAtualizadas += 1;
  } else {
    await prisma.empresa.create({
      data: {
        id: randomUUID(),
        created_date: row.created_date || new Date(),
        ...empresaData
      }
    });
    empresasCriadas += 1;
  }
}

const empresas = await prisma.empresa.findMany({
  select: { nome: true, cnpj: true, contrato_numero: true }
});
const empresasPorContrato = new Map(empresas.filter((row) => row.contrato_numero && formatCNPJ(row.cnpj)).map((row) => [row.contrato_numero, row]));
const empresasPorNome = new Map(empresas.filter((row) => formatCNPJ(row.cnpj)).map((row) => [normalizeName(row.nome), row]));

const notificationRows = await prisma.notificaFacilNotification.findMany({
  select: { id: true, empresa: true, cnpj: true, contrato_numero: true },
  take: 10000
});
const updates = notificationRows.flatMap((row) => {
  const match = (row.contrato_numero && empresasPorContrato.get(row.contrato_numero)) || empresasPorNome.get(normalizeName(row.empresa));
  if (!match?.cnpj || row.cnpj === match.cnpj) return [];
  if (row.cnpj && formatCNPJ(row.cnpj) && row.cnpj !== match.cnpj) return [];
  return [{ id: row.id, cnpj: match.cnpj }];
});
for (const row of updates) {
  await prisma.notificaFacilNotification.update({ where: { id: row.id }, data: { cnpj: row.cnpj, updated_date: new Date() } });
}
notificacoesCorrigidas += updates.length;

const stillInvalid = notificationRows.filter((row) => row.cnpj && !formatCNPJ(row.cnpj));
const invalidBySameName = stillInvalid.filter((row) => normalizeName(row.cnpj) === normalizeName(row.empresa));
if (invalidBySameName.length) {
  for (const row of invalidBySameName) {
    await prisma.notificaFacilNotification.update({ where: { id: row.id }, data: { cnpj: null, updated_date: new Date() } });
  }
}

const empresasInvalidas = await prisma.empresa.findMany({ select: { id: true, cnpj: true } });
let empresasCnpjInvalidosRemovidos = 0;
for (const row of empresasInvalidas.filter((item) => item.cnpj && !formatCNPJ(item.cnpj))) {
  await prisma.empresa.update({ where: { id: row.id }, data: { cnpj: null, updated_date: new Date() } });
  empresasCnpjInvalidosRemovidos += 1;
}

const notificaFacilEmpresasInvalidas = await prisma.notificaFacilEmpresa.findMany({ select: { id: true, cnpj: true } });
let notificaFacilEmpresasCnpjInvalidosRemovidos = 0;
for (const row of notificaFacilEmpresasInvalidas.filter((item) => item.cnpj && !formatCNPJ(item.cnpj))) {
  await prisma.notificaFacilEmpresa.update({ where: { id: row.id }, data: { cnpj: null, updated_date: new Date() } });
  notificaFacilEmpresasCnpjInvalidosRemovidos += 1;
}

console.log(JSON.stringify({
  baseCnpjCorrigidos,
  baseCnpjInvalidosRemovidos,
  empresasCriadas,
  empresasAtualizadas,
  notificacoesCorrigidas,
  notificacoesComCnpjNomeRemovido: invalidBySameName.length,
  empresasCnpjInvalidosRemovidos,
  notificaFacilEmpresasCnpjInvalidosRemovidos
}, null, 2));

await prisma.$disconnect();
