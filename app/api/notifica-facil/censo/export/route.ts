import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { canAccessPortal, getCurrentUser } from "@/lib/auth";
import { formatDate, formatPtBrDisplay } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildWhere(params: URLSearchParams) {
  const filters: Prisma.NotificaFacilNotificationWhereInput[] = [
    { numero_registro_censo: { not: null } }
  ];
  if (params.get("historico") === "true") {
    filters.push({
      OR: [
        { censo_finalizado: true },
        { status: { in: ["Finalizado", "Excluído", "Excluido"] } }
      ]
    });
  } else {
    filters.push({ censo_finalizado: false });
  }
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

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!canAccessPortal(user)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const rows = await prisma.notificaFacilNotification.findMany({
    where: buildWhere(request.nextUrl.searchParams),
    orderBy: [{ created_date: "desc" }, { numero_registro_censo: "desc" }],
    take: 5000
  });

  const headers = ["Data", "Nº Registro CENSO", "Empresa", "Empresa Incorporada", "Endereço", "Bairro", "Cidade", "Status", "Observação", "Ordem de Venda"];
  const body = rows.map((row) => [
    formatDate(row.created_date),
    row.numero_registro_censo,
    row.empresa,
    row.empresa_incorporada,
    row.empresa_endereco,
    row.empresa_bairro,
    formatPtBrDisplay(row.empresa_cidade),
    row.status,
    row.observacoes,
    row.ordem_venda
  ]);
  const csv = `\uFEFF${[headers, ...body].map((line) => line.map(csvCell).join(";")).join("\r\n")}`;
  const filename = request.nextUrl.searchParams.get("historico") === "true" ? "historico-censo.csv" : "importar-censo.csv";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
