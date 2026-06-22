import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Download, Eye, Plus } from "lucide-react";
import { AutoSearchInput } from "@/components/auto-search-input";
import { prisma } from "@/lib/prisma";
import { canEdit as canEditUser, requireUser } from "@/lib/auth";
import { LEGACY_NOTIFICADO_STATUSES, STATUS_OPTIONS, ORIGEM_OPTIONS } from "@/lib/constants";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatPtBrDisplay } from "@/lib/format";
import { cnpjSearchTerm } from "@/lib/cnpj";
import { updateNotificacaoStatus } from "../actions";

export default async function NotificacoesPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) || {};
  const user = await requireUser();
  const canEdit = canEditUser(user);
  const page = Math.max(Number(params.page || 1), 1);
  const take = 25;
  const skip = (page - 1) * take;
  const where: Prisma.NotificacaoWhereInput = {};

  if (params.status === "Notificado") {
    where.status = { in: [...LEGACY_NOTIFICADO_STATUSES] };
  } else if (params.status) {
    where.status = params.status;
  }
  if (params.origem) where.origem = params.origem;
  if (params.empresa) where.empresa = { contains: params.empresa, mode: "insensitive" };
  if (params.cidade) where.cidade = { contains: params.cidade, mode: "insensitive" };
  if (params.lote) where.OR = [{ lote_id: params.lote }, { lote_nome: { contains: params.lote, mode: "insensitive" } }];
  if (params.vencimento) where.vencimento = { contains: params.vencimento, mode: "insensitive" };
  if (params.q) {
    const search = { contains: params.q, mode: "insensitive" as const };
    const cnpjSearch = { contains: cnpjSearchTerm(params.q), mode: "insensitive" as const };
    where.OR = [
      { numero_oficio: search },
      { empresa: search },
      { cidade: search },
      { cnpj: search },
      { cnpj: cnpjSearch },
      { contrato_numero: search },
      { lote_nome: search }
    ];
  }
  if (params.arquivada !== "true") where.arquivada = false;

  const [items, total] = await Promise.all([
    prisma.notificacao.findMany({
      where,
      orderBy: [{ created_date: "desc" }, { id: "desc" }],
      skip,
      take
    }),
    prisma.notificacao.count({ where })
  ]);

  const totalPages = Math.max(Math.ceil(total / take), 1);
  const redirectTo = `/notificacoes?${new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  ).toString()}`;

  return (
    <>
      <PageTitle
        title="Notificações"
        subtitle={`${total} registro(s) encontrados`}
        action={
          canEdit ? (
            <Link href="/notificacoes/nova" className="btn-primary">
              <Plus size={16} />
              Nova
            </Link>
          ) : null
        }
      />

      <form className="panel mb-4 grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-7">
        <label className="md:col-span-2">
          <span className="label">Busca</span>
          <AutoSearchInput defaultValue={params.q || ""} placeholder="Buscar..." iconClassName="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </label>
        <label>
          <span className="label">Status</span>
          <select className="field mt-1" name="status" defaultValue={params.status || ""}>
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Origem</span>
          <select className="field mt-1" name="origem" defaultValue={params.origem || ""}>
            <option value="">Todas</option>
            {ORIGEM_OPTIONS.map((origem) => <option key={origem}>{origem}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Empresa</span>
          <AutoSearchInput name="empresa" defaultValue={params.empresa || ""} placeholder="Empresa" className="mt-1" inputClassName="field" showIcon={false} />
        </label>
        <label>
          <span className="label">Cidade</span>
          <AutoSearchInput name="cidade" defaultValue={params.cidade || ""} placeholder="Cidade" className="mt-1" inputClassName="field" showIcon={false} />
        </label>
        <label>
          <span className="label">Lote</span>
          <AutoSearchInput name="lote" defaultValue={params.lote || ""} placeholder="Lote" className="mt-1" inputClassName="field" showIcon={false} />
        </label>
        <label>
          <span className="label">Vencimento</span>
          <AutoSearchInput name="vencimento" defaultValue={params.vencimento || ""} placeholder="Vencimento" className="mt-1" inputClassName="field" showIcon={false} />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="arquivada" value="true" defaultChecked={params.arquivada === "true"} />
          Incluir arquivadas
        </label>
        <div className="flex items-end">
          <button className="btn-secondary w-full">Filtrar</button>
        </div>
      </form>

      <form action="/api/downloads/selecionados" method="post" className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-sm font-semibold">Resultados</span>
          <button className="btn-secondary" type="submit">
            <Download size={16} />
            Seleção
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3">Ofício</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Downloads</th>
                <th className="px-4 py-3">Criada</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3"><input type="checkbox" name="ids" value={item.id} /></td>
                  <td className="px-4 py-3 font-medium">{item.numero_oficio || "-"}</td>
                  <td className="px-4 py-3">{item.empresa || "-"}</td>
                  <td className="px-4 py-3">{formatPtBrDisplay(item.cidade)}</td>
                  <td className="px-4 py-3">{item.lote_nome || item.lote_id || "-"}</td>
                  <td className="px-4 py-3">{item.origem}</td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-44 flex-col gap-2">
                      <StatusBadge status={item.status} />
                      {canEdit ? (
                        <div className="flex flex-wrap gap-1">
                          {STATUS_OPTIONS.map((status) => (
                            <button
                              key={status}
                              type="submit"
                              form={`status-${item.id}-${status}`}
                              className="rounded-full border border-line px-2 py-1 text-[11px] font-bold text-edp-muted transition hover:border-edp/50 hover:bg-edp/10 hover:text-edp"
                              title={`Marcar como ${status}`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">{item.download_count}</td>
                  <td className="px-4 py-3">{formatDateTime(item.created_date)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link className="btn-secondary px-2" href={`/notificacoes/${item.id}`} title="Abrir">
                      <Eye size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>

      {canEdit ? (
        <div className="hidden">
          {items.flatMap((item) =>
            STATUS_OPTIONS.map((status) => (
              <form key={`${item.id}-${status}`} id={`status-${item.id}-${status}`} action={updateNotificacaoStatus.bind(null, item.id)}>
                <input type="hidden" name="status" value={status} />
                <input type="hidden" name="redirect_to" value={redirectTo} />
              </form>
            ))
          )}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between text-sm">
        <span>Página {page} de {totalPages}</span>
        <div className="flex gap-2">
          <Link className="btn-secondary" href={`/notificacoes?page=${Math.max(page - 1, 1)}`}>Anterior</Link>
          <Link className="btn-secondary" href={`/notificacoes?page=${Math.min(page + 1, totalPages)}`}>Próxima</Link>
        </div>
      </div>
    </>
  );
}
