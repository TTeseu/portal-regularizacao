import { prisma } from "@/lib/prisma";
import { requireFormattedCNPJ } from "@/lib/cnpj";

export const EMPRESA_BLOQUEADA_ERROR_CODE = "empresa-bloqueada";

export function empresaBloqueadaMessage(empresa?: string | null) {
  const nome = empresa ? ` para ${empresa}` : " para esta empresa";
  return `Nao pode ser gerada uma notificacao${nome}. Para mais informacoes, consulte os superiores.`;
}

export class EmpresaNotificacaoBloqueadaError extends Error {
  code = EMPRESA_BLOQUEADA_ERROR_CODE;
  empresa?: string;

  constructor(empresa?: string | null) {
    super(empresaBloqueadaMessage(empresa));
    this.name = "EmpresaNotificacaoBloqueadaError";
    this.empresa = empresa || undefined;
  }
}

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim();
}

function normalizeCnpj(value: string | null | undefined) {
  try {
    return value ? requireFormattedCNPJ(value) : null;
  } catch {
    return normalizeText(value) || null;
  }
}

export async function assertEmpresasNotificacaoLiberadaByIds(ids: string[]) {
  const cleanIds = ids.map((id) => id.trim()).filter(Boolean);
  if (!cleanIds.length) return;

  const bloqueadas = await prisma.empresa.findMany({
    where: {
      id: { in: cleanIds },
      bloqueio_notificacao: true
    },
    select: { nome: true }
  });

  if (bloqueadas.length) {
    throw new EmpresaNotificacaoBloqueadaError(bloqueadas.map((empresa) => empresa.nome).join(", "));
  }
}

export async function assertEmpresaNotificacaoLiberada(input: {
  empresa?: string | null;
  cnpj?: string | null;
  contrato_numero?: string | null;
}) {
  const empresa = normalizeText(input.empresa);
  const cnpj = normalizeCnpj(input.cnpj);
  const contrato = normalizeText(input.contrato_numero);
  const filters = [];

  if (empresa) filters.push({ nome: { equals: empresa, mode: "insensitive" as const } });
  if (cnpj) filters.push({ cnpj });
  if (contrato) filters.push({ contrato_numero: contrato });
  if (!filters.length) return;

  const bloqueada = await prisma.empresa.findFirst({
    where: {
      bloqueio_notificacao: true,
      OR: filters
    },
    select: { nome: true }
  });

  if (bloqueada) {
    throw new EmpresaNotificacaoBloqueadaError(bloqueada.nome);
  }
}

export function isEmpresaNotificacaoBloqueadaError(error: unknown): error is EmpresaNotificacaoBloqueadaError {
  return error instanceof EmpresaNotificacaoBloqueadaError;
}
