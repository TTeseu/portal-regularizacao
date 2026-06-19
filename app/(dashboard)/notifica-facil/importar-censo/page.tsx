import Link from "next/link";
import { ArrowLeft, Bot, Download, FileSpreadsheet, RefreshCw, Save, Trash2, Upload } from "lucide-react";
import { Prisma } from "@prisma/client";
import { AutoSearchInput } from "@/components/auto-search-input";
import { canEdit as canEditUser, requireUser } from "@/lib/auth";
import { formatDate, formatPtBrDisplay } from "@/lib/format";
import { activeCensoWhere } from "@/lib/notifica-facil-censo";
import { prisma } from "@/lib/prisma";
import {
  clearNotificaFacilCensoObservacoes,
  importNotificaFacilCensoCsv,
  prepareNotificaFacilFromCenso,
  updateNotificaFacilCensoRegistro
} from "../actions";

function buildWhere(params: Record<string, string | undefined>) {
  const filters: Prisma.NotificaFacilNotificationWhereInput[] = [activeCensoWhere];
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
  if (params.empresa) filters.push({ empresa: { contains: params.empresa, mode: "insensitive" } });
  return { AND: filters } satisfies Prisma.NotificaFacilNotificationWhereInput;
}

export default async function ImportarCensoPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const [params, user] = await Promise.all([searchParams, requireUser()]);
  const values = params || {};
  const canEdit = canEditUser(user);
  const where = buildWhere(values);
  const query = new URLSearchParams();
  if (values.q) query.set("q", values.q);
  if (values.empresa) query.set("empresa", values.empresa);
  query.set("tipo", "importar-censo");
  const [items, total, empresasIdentificadas] = await Promise.all([
    prisma.notificaFacilNotification.findMany({
      where,
      orderBy: [{ created_date: "desc" }, { numero_registro_censo: "desc" }],
      take: 250
    }),
    prisma.notificaFacilNotification.count({ where }),
    prisma.notificaFacilNotification.groupBy({ by: ["empresa"], where: activeCensoWhere, _count: { empresa: true } })
  ]);

  return (
    <div className="mx-auto max-w-[1800px] space-y-6">
      <Link href="/notifica-facil" className="btn-secondary">
        <ArrowLeft size={16} />
        Voltar ao Dashboard
      </Link>

      <section className="panel overflow-hidden">
        <div className="relative p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(0,230,118,0.18),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_62%)]" />
          <div className="relative flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-edp/25 bg-edp/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-edp">
                <Upload size={14} />
                Processo Notifica Fácil
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Importar CENSO</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-edp-muted">
                Registros recebidos do app COLETA DE DADOS para validação, complemento de informações, fotos, observações e envio ao fluxo documental.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/notifica-facil/importar-censo" className="btn-secondary"><RefreshCw size={16} />Atualizar</Link>
              <a href={`/api/notifica-facil/export?${query.toString()}`} className="btn-secondary"><Download size={16} />Exportar CSV</a>
              {canEdit ? (
                <button className="btn-primary" type="submit" form="censo-select-form">
                  <FileSpreadsheet size={16} />
                  Gerar notificacao
                </button>
              ) : null}
              <button className="btn-secondary" type="button"><Bot size={16} />Ler Legendas (IA)</button>
              {canEdit ? (
                <form action={clearNotificaFacilCensoObservacoes}>
                  <button className="btn-secondary border-amber-300/40 text-amber-100" type="submit"><Trash2 size={16} />Limpar Observações (Todos)</button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {canEdit ? (
        <form action={importNotificaFacilCensoCsv} className="panel flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
          <label className="flex-1">
            <span className="label">Importar planilha CSV do CENSO</span>
            <input className="field mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-edp file:px-3 file:py-2 file:text-sm file:font-bold file:text-edp-navy" type="file" name="arquivo" accept=".csv,text/csv" required />
          </label>
          <button className="btn-primary h-11" type="submit"><FileSpreadsheet size={16} />Importar CSV</button>
          {values.importados ? <span className="text-sm font-semibold text-edp">{values.importados} importados · {values.ignorados || 0} já existentes</span> : null}
          {values.erro && !["selecao", "empresas"].includes(values.erro) ? <span className="text-sm font-semibold text-red-200">Selecione um arquivo CSV valido.</span> : null}
        </form>
      ) : null}

      {values.erro === "selecao" ? (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
          Selecione ao menos um CENSO disponivel para gerar a notificacao.
        </div>
      ) : null}
      {values.erro === "empresas" ? (
        <div className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
          Selecione apenas CENSOs da mesma empresa para gerar uma notificacao.
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-3">
        <Metric label="Registros recebidos" value={total} tone="blue" />
        <Metric label="Empresas identificadas" value={empresasIdentificadas.length} tone="yellow" />
        <Metric label="Disponiveis" value={total} tone="green" />
      </section>

      <form className="panel p-4">
        <label>
          <span className="label">Buscar</span>
          <AutoSearchInput defaultValue={values.q || ""} placeholder="Buscar por endereço, bairro, cidade ou empresa..." />
        </label>
      </form>

      <form id="censo-select-form" action={prepareNotificaFacilFromCenso} className="panel overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-bold text-white">Registros Recebidos do COLETA DE DADOS</h2>
          <p className="mt-1 text-sm text-edp-muted">Mostrando {items.length} de {total} registros.</p>
        </div>
        <div className="table-scroll">
          <table className="w-full min-w-[1600px] text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Nº Registro</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Empresa Incorporada</th>
                <th className="px-4 py-3">Endereço</th>
                <th className="px-4 py-3">Bairro</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Nº Poste</th>
                <th className="px-4 py-3">Coordenadas</th>
                <th className="px-4 py-3">Fotos</th>
                <th className="px-4 py-3">Status Banco</th>
                <th className="px-4 py-3">Observação</th>
                <th className="px-4 py-3">Ordem de Venda</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-line align-top">
                  <td className="px-4 py-4"><input type="checkbox" name="censo_ids" value={item.id} /></td>
                  <td className="px-4 py-4 text-edp-muted">{formatDate(item.created_date)}</td>
                  <td className="px-4 py-4 font-bold text-edp">{item.numero_registro_censo}</td>
                  <td className="px-4 py-4">
                    <RowInput id={item.id} name="empresa" value={item.empresa} />
                  </td>
                  <td className="px-4 py-4"><RowInput id={item.id} name="empresa_incorporada" value={item.empresa_incorporada} /></td>
                  <td className="px-4 py-4"><RowInput id={item.id} name="empresa_endereco" value={item.empresa_endereco} /></td>
                  <td className="px-4 py-4"><RowInput id={item.id} name="empresa_bairro" value={item.empresa_bairro} /></td>
                  <td className="px-4 py-4"><RowInput id={item.id} name="empresa_cidade" value={formatPtBrDisplay(item.empresa_cidade)} /></td>
                  <td className="px-4 py-4"><RowInput id={item.id} name="numero_poste" value={item.numero_poste} /></td>
                  <td className="px-4 py-4 text-xs text-edp-muted">{item.latitude && item.longitude ? `${item.latitude}, ${item.longitude}` : "-"}</td>
                  <td className="px-4 py-4"><PhotoCount value={item.fotos_censo} /></td>
                  <td className="px-4 py-4"><RowInput id={item.id} name="status" value={item.status} /></td>
                  <td className="px-4 py-4"><RowInput id={item.id} name="observacoes" value={item.observacoes} wide /></td>
                  <td className="px-4 py-4"><RowInput id={item.id} name="ordem_venda" value={item.ordem_venda} /></td>
                  <td className="px-4 py-4">
                    <SaveButton formId={`censo-form-${item.id}`} />
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-12 text-center text-edp-muted">Nenhum registro recebido encontrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </form>

      <div className="hidden">
        {items.map((item) => (
          <form key={item.id} id={`censo-form-${item.id}`} action={updateNotificaFacilCensoRegistro.bind(null, item.id)} />
        ))}
      </div>
    </div>
  );
}

function RowInput({ id, name, value, wide = false }: { id: string; name: string; value?: string | null; wide?: boolean }) {
  return <input className={`field h-9 ${wide ? "min-w-72" : "min-w-44"}`} name={name} form={`censo-form-${id}`} defaultValue={value || ""} />;
}

function SaveButton({ formId }: { formId: string }) {
  return (
    <button className="btn-secondary h-9 px-3" type="submit" form={formId} title="Salvar linha">
      <Save size={14} />
    </button>
  );
}

function PhotoCount({ value }: { value: unknown }) {
  const count = Array.isArray(value) ? value.length : 0;
  return <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-edp-muted">{count} foto(s)</span>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "blue" | "yellow" | "green" }) {
  const tones = {
    blue: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    yellow: "border-yellow-300/20 bg-yellow-300/10 text-yellow-100",
    green: "border-edp/25 bg-edp/10 text-edp"
  };
  return (
    <div className={`rounded-2xl border p-6 shadow-lg shadow-black/10 ${tones[tone]}`}>
      <div className="text-xs font-bold uppercase tracking-wide text-edp-muted">{label}</div>
      <div className="mt-3 text-3xl font-bold text-white">{value}</div>
    </div>
  );
}
