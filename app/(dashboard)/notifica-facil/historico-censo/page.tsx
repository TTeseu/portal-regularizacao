import Link from "next/link";
import { ArrowLeft, Download, Filter, Search } from "lucide-react";
import { Prisma } from "@prisma/client";
import { formatDate, formatPtBrDisplay } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const historyWhere: Prisma.NotificaFacilNotificationWhereInput = {
  numero_registro_censo: { not: null },
  OR: [
    { censo_finalizado: true },
    { status: { in: ["Finalizado", "Excluído", "Excluido"] } }
  ]
};

function buildWhere(params: Record<string, string | undefined>) {
  const filters: Prisma.NotificaFacilNotificationWhereInput[] = [historyWhere];
  if (params.q) {
    const q = { contains: params.q, mode: "insensitive" as const };
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
  if (params.status) filters.push({ status: params.status });
  if (params.empresa) filters.push({ empresa: { contains: params.empresa, mode: "insensitive" } });
  return { AND: filters } satisfies Prisma.NotificaFacilNotificationWhereInput;
}

export default async function HistoricoCensoPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) || {};
  const where = buildWhere(params);
  const [items, total] = await Promise.all([
    prisma.notificaFacilNotification.findMany({
      where,
      orderBy: [{ created_date: "desc" }, { numero_registro_censo: "desc" }],
      take: 2000
    }),
    prisma.notificaFacilNotification.count({ where })
  ]);

  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.empresa) query.set("empresa", params.empresa);
  query.set("historico", "true");

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <Link href="/notifica-facil" className="btn-secondary">
        <ArrowLeft size={16} />
        Voltar ao Dashboard
      </Link>

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Histórico do CENSO</h1>
          <p className="mt-2 text-sm text-edp-muted">Registros validados ou reportados, incluindo finalizados e excluídos.</p>
        </div>
        <a href={`/api/notifica-facil/censo/export?${query.toString()}`} className="btn-primary">
          <Download size={16} />
          Exportar Excel
        </a>
      </div>

      <section className="panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-5 py-4">
          <Filter className="text-edp" size={18} />
          <h2 className="font-bold text-white">Filtros</h2>
        </div>
        <form className="grid gap-4 p-5 lg:grid-cols-3">
          <label>
            <span className="label">Buscar</span>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-edp-muted" size={16} />
              <input className="field pl-9" name="q" defaultValue={params.q || ""} placeholder="Buscar por registro, empresa, endereço..." />
            </div>
          </label>
          <label>
            <span className="label">Status</span>
            <select className="field mt-1" name="status" defaultValue={params.status || ""}>
              <option value="">Todos os Status</option>
              <option>Finalizado</option>
              <option>Excluído</option>
            </select>
          </label>
          <label>
            <span className="label">Filtrar por Empresa</span>
            <input className="field mt-1" name="empresa" defaultValue={params.empresa || ""} placeholder="Nome da empresa..." />
          </label>
          <div className="lg:col-span-3 text-sm text-edp-muted">Mostrando {items.length} de {total} registros</div>
        </form>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-bold text-white">Registros Finalizados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Nº Registro</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Empresa Incorporada</th>
                <th className="px-4 py-3">Endereço</th>
                <th className="px-4 py-3">Bairro</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Observação</th>
                <th className="px-4 py-3">Ordem de Venda</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-4 py-3 text-edp-muted">{formatDate(item.created_date)}</td>
                  <td className="px-4 py-3 font-bold text-edp">{item.numero_registro_censo}</td>
                  <td className="px-4 py-3 text-white">{item.empresa}</td>
                  <td className="px-4 py-3 text-edp-muted">{item.empresa_incorporada || "-"}</td>
                  <td className="px-4 py-3 text-edp-muted">{item.empresa_endereco || "-"}</td>
                  <td className="px-4 py-3 text-edp-muted">{item.empresa_bairro || "-"}</td>
                  <td className="px-4 py-3 text-edp-muted">{formatPtBrDisplay(item.empresa_cidade)}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3 text-edp-muted">{item.observacoes || "-"}</td>
                  <td className="px-4 py-3 text-edp-muted">{item.ordem_venda || "-"}</td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-edp-muted">Nenhum registro no histórico do CENSO.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const tone = normalized.includes("exclu")
    ? "border-red-300/30 bg-red-300/15 text-red-100"
    : "border-edp/35 bg-edp/15 text-edp";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>{status}</span>;
}
