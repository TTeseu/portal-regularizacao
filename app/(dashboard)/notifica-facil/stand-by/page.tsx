import Link from "next/link";
import { ArrowLeft, Clock3, FileText } from "lucide-react";
import { Prisma } from "@prisma/client";
import { AutoSearchInput } from "@/components/auto-search-input";
import { formatDate, formatPtBrDisplay } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function buildWhere(params: Record<string, string | undefined>) {
  const filters: Prisma.NotificaFacilNotificationWhereInput[] = [{ is_standby: true }];
  if (params.q) {
    const q = { contains: params.q, mode: "insensitive" as const };
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
  return { AND: filters } satisfies Prisma.NotificaFacilNotificationWhereInput;
}

export default async function StandByPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) || {};
  const where = buildWhere(params);
  const exportQuery = new URLSearchParams();
  exportQuery.set("tipo", "stand-by");
  if (params.q) exportQuery.set("q", params.q);
  const [items, total] = await Promise.all([
    prisma.notificaFacilNotification.findMany({
      where,
      orderBy: [{ updated_date: "desc" }, { created_date: "desc" }],
      take: 250
    }),
    prisma.notificaFacilNotification.count({ where })
  ]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <Link href="/notifica-facil" className="btn-secondary">
        <ArrowLeft size={16} />
        Voltar ao Dashboard
      </Link>

      <section className="panel overflow-hidden">
        <div className="relative p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(0,230,118,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_60%)]" />
          <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-edp/25 bg-edp/10 text-edp">
                <Clock3 size={24} />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-edp/25 bg-edp/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-edp">
                  Processo Notifica Fácil
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Stand-by</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-edp-muted">
                  Notificações do Notifica Fácil marcadas como stand-by, isoladas do fluxo principal e sem misturar com o Portal de Regularização.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a className="btn-secondary" href={`/api/notifica-facil/export?${exportQuery.toString()}`}>
                Exportar CSV
              </a>
              <div className="rounded-2xl border border-line bg-surface px-5 py-4 text-right">
                <div className="text-xs font-bold uppercase tracking-wide text-edp-muted">Total filtrado</div>
                <div className="mt-1 text-3xl font-bold text-white">{total}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <form className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label>
            <span className="label">Buscar</span>
            <AutoSearchInput defaultValue={params.q || ""} placeholder="Empresa, censo, protocolo, contrato ou cidade..." />
          </label>
          <button className="btn-primary h-11" type="submit">Filtrar</button>
        </form>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line px-6 py-5">
          <FileText className="text-edp" size={22} />
          <div>
            <h2 className="text-xl font-bold text-white">Registros em stand-by</h2>
            <p className="mt-1 text-sm text-edp-muted">Mostrando {items.length} de {total} registros.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr>
                <th className="px-5 py-4">Notificação</th>
                <th className="px-5 py-4">Empresa</th>
                <th className="px-5 py-4">Registro CENSO</th>
                <th className="px-5 py-4">Cidade</th>
                <th className="px-5 py-4">Atualização</th>
                <th className="px-5 py-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-5 py-4">
                    <Link href={`/notifica-facil/${item.id}`} className="font-bold text-edp hover:text-edp-hover">
                      {item.numero_notificacao || item.numero_protocolo || item.id}
                    </Link>
                    <div className="mt-1 text-xs text-edp-muted">{formatDate(item.created_date)}</div>
                  </td>
                  <td className="px-5 py-4 text-white">{item.empresa}</td>
                  <td className="px-5 py-4 text-edp-muted">{item.numero_registro_censo || "-"}</td>
                  <td className="px-5 py-4 text-edp-muted">{formatPtBrDisplay(item.empresa_cidade)}</td>
                  <td className="px-5 py-4 text-edp-muted">{formatDate(item.updated_date || item.created_date)}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/notifica-facil/${item.id}`} className="btn-secondary h-9 px-3 text-xs">Abrir/Editar</Link>
                      {item.numero_notificacao ? <a href={`/api/notifica-facil/notifications/${item.id}/pdf`} className="btn-primary h-9 px-3 text-xs">PDF</a> : null}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-edp-muted">Nenhum registro em stand-by encontrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
