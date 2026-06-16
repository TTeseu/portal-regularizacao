import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { canAccessPortal, getCurrentUser } from "@/lib/auth";
import { formatCNPJDisplay } from "@/lib/cnpj";
import { formatDate, formatPtBrDisplay } from "@/lib/format";
import { activeCensoWhere, historyCensoWhere } from "@/lib/notifica-facil-censo";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ExportType =
  | "importar-censo"
  | "historico-censo"
  | "pendencia-tecnica"
  | "historico-pendencia-tecnica"
  | "stand-by"
  | "empresas";

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

function csvResponse(filename: string, headers: string[], rows: unknown[][]) {
  const csv = `\uFEFF${[headers, ...rows].map((line) => line.map(csvCell).join(";")).join("\r\n")}`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store"
    }
  });
}

function todayStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function pendenciaWhere(historico: boolean, q: string | null) {
  const filters: Prisma.NotificaFacilNotificationWhereInput[] = [{
    numero_notificacao: null,
    OR: [
      { pendencia_tecnica: true },
      { pt_notificado: true },
      { pt_data_notificado: { not: null } }
    ]
  }];
  if (historico) filters.push({ OR: [{ pt_notificado: true }, { pt_data_notificado: { not: null } }] });
  if (q) {
    const search = { contains: q, mode: "insensitive" as const };
    filters.push({
      OR: [
        { empresa: search },
        { numero_registro_censo: search },
        { numero_protocolo: search },
        { contrato_numero: search },
        { empresa_cidade: search },
        { observacoes: search }
      ]
    });
  }
  return { AND: filters } satisfies Prisma.NotificaFacilNotificationWhereInput;
}

function censoWhere(historico: boolean, params: URLSearchParams) {
  const filters: Prisma.NotificaFacilNotificationWhereInput[] = [historico ? historyCensoWhere : activeCensoWhere];
  const qParam = params.get("q");
  if (qParam) {
    const q = { contains: qParam, mode: "insensitive" as const };
    filters.push({
      OR: [
        { numero_registro_censo: q },
        { empresa: q },
        { empresa_endereco: q },
        { empresa_bairro: q },
        { empresa_cidade: q },
        { observacoes: q },
        { ordem_venda: q }
      ]
    });
  }
  const status = params.get("status");
  if (status) filters.push({ status });
  const empresa = params.get("empresa");
  if (empresa) filters.push({ empresa: { contains: empresa, mode: "insensitive" } });
  return { AND: filters } satisfies Prisma.NotificaFacilNotificationWhereInput;
}

function standbyWhere(params: URLSearchParams) {
  const filters: Prisma.NotificaFacilNotificationWhereInput[] = [{ is_standby: true }];
  const qParam = params.get("q");
  if (qParam) {
    const q = { contains: qParam, mode: "insensitive" as const };
    filters.push({
      OR: [
        { empresa: q },
        { numero_notificacao: q },
        { numero_registro_censo: q },
        { numero_protocolo: q },
        { contrato_numero: q },
        { empresa_cidade: q },
        { observacoes: q }
      ]
    });
  }
  const status = params.get("status");
  if (status) filters.push({ status });
  return { AND: filters } satisfies Prisma.NotificaFacilNotificationWhereInput;
}

async function exportNotifications(tipo: ExportType, params: URLSearchParams) {
  const where =
    tipo === "importar-censo" ? censoWhere(false, params) :
    tipo === "historico-censo" ? censoWhere(true, params) :
    tipo === "stand-by" ? standbyWhere(params) :
    tipo === "historico-pendencia-tecnica" ? pendenciaWhere(true, params.get("q")) :
    pendenciaWhere(false, params.get("q"));

  const rows = await prisma.notificaFacilNotification.findMany({
    where,
    orderBy: [{ created_date: "desc" }, { updated_date: "desc" }],
    take: 10000
  });

  const headers = [
    "Data",
    "Numero notificacao",
    "Numero registro CENSO",
    "Empresa",
    "CNPJ",
    "Contrato",
    "Endereco",
    "Bairro",
    "Cidade",
    "Status",
    "PT notificado",
    "Data PT",
    "Stand-by",
    "Observacao",
    "Ordem de venda"
  ];
  const body = rows.map((row) => [
    formatDate(row.created_date),
    row.numero_notificacao,
    row.numero_registro_censo,
    row.empresa,
    formatCNPJDisplay(row.cnpj),
    row.contrato_numero,
    row.empresa_endereco,
    row.empresa_bairro,
    formatPtBrDisplay(row.empresa_cidade),
    row.status,
    row.pt_notificado ? "Sim" : "Nao",
    row.pt_data_notificado,
    row.is_standby ? "Sim" : "Nao",
    row.observacoes,
    row.ordem_venda
  ]);
  return csvResponse(`${tipo}-${todayStamp()}.csv`, headers, body);
}

async function exportEmpresas(params: URLSearchParams) {
  const qParam = params.get("q");
  const where: Prisma.EmpresaWhereInput = qParam ? {
    OR: [
      { nome: { contains: qParam, mode: "insensitive" } },
      { cnpj: { contains: qParam, mode: "insensitive" } },
      { contrato_numero: { contains: qParam, mode: "insensitive" } },
      { cidade: { contains: qParam, mode: "insensitive" } }
    ]
  } : {};
  const rows = await prisma.empresa.findMany({ where, orderBy: { nome: "asc" }, take: 10000 });
  const headers = ["Nome", "CNPJ", "Contrato", "Endereco", "Bairro", "Cidade", "Estado", "Celebrado em", "Vencimento", "Status envio"];
  const body = rows.map((row) => [
    row.nome,
    formatCNPJDisplay(row.cnpj),
    row.contrato_numero,
    row.endereco,
    row.bairro,
    formatPtBrDisplay(row.cidade),
    row.estado,
    row.celebrado_em,
    row.vencimento_contrato,
    row.status_envio_notificacao
  ]);
  return csvResponse(`banco-empresas-${todayStamp()}.csv`, headers, body);
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!canAccessPortal(user)) return Response.json({ error: "Nao autorizado" }, { status: 401 });

  const tipo = (request.nextUrl.searchParams.get("tipo") || "importar-censo") as ExportType;
  if (tipo === "empresas") return exportEmpresas(request.nextUrl.searchParams);
  return exportNotifications(tipo, request.nextUrl.searchParams);
}
