import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowLeft, Bell, CheckCircle2, Clock3, Download, FileText, Plus } from "lucide-react";
import { NotificaFacilNotification, Prisma } from "@prisma/client";
import { AutoSearchInput } from "@/components/auto-search-input";
import { NotificaFacilNotificationChart } from "@/components/notifica-facil-notification-chart";
import { canEdit as canEditUser, requireUser } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { notificaFacilAddressCity } from "@/lib/notifica-facil-address";
import { prisma } from "@/lib/prisma";
import {
  markNotificaFacilPtNotificado,
  markNotificaFacilRegularizacaoNotificada,
  unmarkNotificaFacilPtNotificado,
  unmarkNotificaFacilRegularizacaoNotificada
} from "@/app/(dashboard)/notifica-facil/actions";

type Mode = "ativas" | "historico" | "notificar";
type ProcessKind = "pendencia" | "regularizacao";
type ListFilter = "todas" | "notificadas" | "resposta-cliente";
type PendenciaItem = NotificaFacilNotification;

const CLIENT_RESPONSE_STATUS = "Resposta do Cliente - Anexo do E-mail.";

const pendenciaImportadaWhere: Prisma.NotificaFacilNotificationWhereInput = {
  numero_notificacao: null,
  OR: [
    { pendencia_tecnica: true },
    { pt_notificado: true },
    { pt_data_notificado: { not: null } }
  ]
};

const notificacaoPendenciaGeradaWhere: Prisma.NotificaFacilNotificationWhereInput = {
  numero_notificacao: { not: null },
  pendencia_tecnica: true
};

const regularizacaoImportadaWhere: Prisma.NotificaFacilNotificationWhereInput = {
  numero_notificacao: null,
  OR: [
    { regularizacao: true },
    { regularizacao_notificada: true },
    { regularizacao_data_notificada: { not: null } }
  ]
};

const notificacaoRegularizacaoGeradaWhere: Prisma.NotificaFacilNotificationWhereInput = {
  numero_notificacao: { not: null },
  regularizacao: true
};

const processConfigs = {
  pendencia: {
    baseWhere: { OR: [pendenciaImportadaWhere, notificacaoPendenciaGeradaWhere] } satisfies Prisma.NotificaFacilNotificationWhereInput,
    notifiedTrue: { pt_notificado: true } satisfies Prisma.NotificaFacilNotificationWhereInput,
    notifiedFalse: { pt_notificado: false } satisfies Prisma.NotificaFacilNotificationWhereInput,
    withDate: { pt_data_notificado: { not: null } } satisfies Prisma.NotificaFacilNotificationWhereInput,
    logTerm: "pendencia",
    activeHref: "/notifica-facil/pendencia-tecnica",
    notifyHref: "/notifica-facil/notificacao-pendencias",
    historyHref: "/notifica-facil/historico-pendencia-tecnica",
    newHref: "/notifica-facil/notificacao-pendencias/nova",
    exportType: "pendencia-tecnica",
    exportHistoryType: "historico-pendencia-tecnica",
    batchLabel: "Lote de pendência técnica",
    totalMetric: "Pendências técnicas",
    waitingMetric: "Aguardando PT",
    notifiedMetric: "PT notificado",
    withDateMetric: "Com data PT",
    listTitle: "Notificações com pendência técnica",
    historyTitle: "Histórico das pendências",
    generatedDescription: "Lotes de notificações geradas e registros pendentes de marcação PT notificado.",
    emptyText: "Nenhuma pendência técnica encontrada.",
    statusColumn: "PT",
    waitingLabel: "Aguardando",
    notifiedLabel: "Notificado",
    noDateLabel: "Sem data PT",
    markLabel: "Marcar como notificada"
  },
  regularizacao: {
    baseWhere: { OR: [regularizacaoImportadaWhere, notificacaoRegularizacaoGeradaWhere] } satisfies Prisma.NotificaFacilNotificationWhereInput,
    notifiedTrue: { regularizacao_notificada: true } satisfies Prisma.NotificaFacilNotificationWhereInput,
    notifiedFalse: { regularizacao_notificada: false } satisfies Prisma.NotificaFacilNotificationWhereInput,
    withDate: { regularizacao_data_notificada: { not: null } } satisfies Prisma.NotificaFacilNotificationWhereInput,
    logTerm: "regularizacao",
    activeHref: "/notifica-facil/regularizacao",
    notifyHref: "/notifica-facil/regularizacao",
    historyHref: "/notifica-facil/historico-regularizacao",
    newHref: "/notifica-facil/regularizacao/nova",
    exportType: "regularizacao",
    exportHistoryType: "historico-regularizacao",
    batchLabel: "Lote de regularização",
    totalMetric: "Regularizações",
    waitingMetric: "Aguardando regularização",
    notifiedMetric: "Regularizadas",
    withDateMetric: "Com data de regularização",
    listTitle: "Notificações de regularização",
    historyTitle: "Histórico de regularização",
    generatedDescription: "Lotes de notificações geradas no processo de regularização.",
    emptyText: "Nenhuma regularização encontrada.",
    statusColumn: "Regularização",
    waitingLabel: "Aguardando",
    notifiedLabel: "Regularizada",
    noDateLabel: "Sem data",
    markLabel: "Marcar regularização"
  }
};

function mergeWhere(base: Prisma.NotificaFacilNotificationWhereInput, extra: Prisma.NotificaFacilNotificationWhereInput) {
  return { AND: [base, extra] } satisfies Prisma.NotificaFacilNotificationWhereInput;
}

function baseWhereForMode(mode: Mode, process: ProcessKind) {
  const config = processConfigs[process];
  if (process === "pendencia" && mode === "notificar") return notificacaoPendenciaGeradaWhere;
  if (process === "regularizacao" && mode === "ativas") return notificacaoRegularizacaoGeradaWhere;
  return config.baseWhere;
}

function currentWhere(mode: Mode, query: string, process: ProcessKind, filter: ListFilter) {
  const config = processConfigs[process];
  const filters: Prisma.NotificaFacilNotificationWhereInput[] = [baseWhereForMode(mode, process)];
  if (mode === "historico") {
    filters.push({ OR: [config.notifiedTrue, config.withDate] });
  }
  if (filter === "notificadas") {
    filters.push(config.notifiedTrue);
  }
  if (filter === "resposta-cliente") {
    filters.push({ status: CLIENT_RESPONSE_STATUS });
  }
  if (query) {
    const q = { contains: query, mode: "insensitive" as const };
    filters.push({
      OR: [
        { empresa: q },
        { numero_notificacao: q },
        { numero_registro_censo: q },
        { numero_protocolo: q },
        { contrato_numero: q },
        { empresa_cidade: q },
        { observacoes: q },
        { lote_nome: q },
        { lote_id: q }
      ]
    });
  }
  return filters.length === 1 ? filters[0] : { AND: filters };
}

function loteDisplayName(item?: PendenciaItem) {
  if (!item) return "Lote sem identificador";
  const numero = item.numero_notificacao || item.numero_registro_censo || item.lote_id || item.lote_nome || item.id;
  const data = formatDate(item.data_notificacao || item.updated_date || item.created_date);
  return `${numero} - ${data}`;
}

function groupGeneratedLotes(items: PendenciaItem[]) {
  const lotes = new Map<string, PendenciaItem[]>();
  const individuais: PendenciaItem[] = [];

  for (const item of items) {
    const loteId = item.lote_id || item.lote_nome;
    const registroKey = item.numero_registro_censo ? `registro:${item.numero_registro_censo}` : "";
    const groupKey = loteId || registroKey;
    if (item.numero_notificacao && groupKey) {
      lotes.set(groupKey, [...(lotes.get(groupKey) || []), item]);
    } else {
      individuais.push(item);
    }
  }

  return {
    lotes: Array.from(lotes.entries()).flatMap(([loteId, rows]) => {
      if (loteId.startsWith("registro:") && rows.length === 1) {
        individuais.push(rows[0]);
        return [];
      }
      return [{
        loteId,
        nome: loteDisplayName(rows[0]),
        rows,
        created_date: rows[0]?.created_date,
        last_downloaded_at: rows.find((row) => row.last_downloaded_at)?.last_downloaded_at,
        last_downloaded_by: rows.find((row) => row.last_downloaded_by)?.last_downloaded_by,
        cidades: Array.from(new Set(rows.map((row) => notificaFacilAddressCity(row.enderecos_revelia, row.empresa_cidade)).filter(Boolean)))
      }];
    }),
    individuais
  };
}

export async function NotificaFacilPendenciasPage({
  title,
  description,
  mode,
  process = "pendencia",
  icon,
  searchParams
}: {
  title: string;
  description: string;
  mode: Mode;
  process?: ProcessKind;
  icon?: ReactNode;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const [params, user] = await Promise.all([searchParams, requireUser()]);
  const q = (params?.q || "").trim();
  const filter = normalizeListFilter(params?.filtro);
  const canEdit = canEditUser(user);
  const config = processConfigs[process];
  const where = currentWhere(mode, q, process, filter);
  const metricBaseWhere = baseWhereForMode(mode, process);
  const generatedWhere = mergeWhere(metricBaseWhere, { numero_notificacao: { not: null } });
  const chartGeneratedWhere = mergeWhere(generatedWhere, { AND: [config.notifiedFalse, { status: { not: CLIENT_RESPONSE_STATUS } }] });
  const chartSentWhere = mergeWhere(generatedWhere, { AND: [config.notifiedTrue, { status: { not: CLIENT_RESPONSE_STATUS } }] });
  const chartRespondedWhere = mergeWhere(generatedWhere, { status: CLIENT_RESPONSE_STATUS });
  const exportQuery = new URLSearchParams();
  exportQuery.set("tipo", mode === "historico" ? config.exportHistoryType : config.exportType);
  if (q) exportQuery.set("q", q);

  const [
    items,
    filteredTotal,
    total,
    aguardando,
    notificados,
    comData,
    respondidas,
    semRespostaCliente,
    chartGenerated,
    chartSent,
    chartResponded,
    logs
  ] = await Promise.all([
    prisma.notificaFacilNotification.findMany({
      where,
      orderBy: [{ updated_date: "desc" }, { created_date: "desc" }],
      take: 1000
    }),
    prisma.notificaFacilNotification.count({ where }),
    prisma.notificaFacilNotification.count({ where: metricBaseWhere }),
    prisma.notificaFacilNotification.count({ where: mergeWhere(metricBaseWhere, config.notifiedFalse) }),
    prisma.notificaFacilNotification.count({ where: mergeWhere(metricBaseWhere, config.notifiedTrue) }),
    prisma.notificaFacilNotification.count({ where: mergeWhere(metricBaseWhere, config.withDate) }),
    prisma.notificaFacilNotification.count({ where: mergeWhere(generatedWhere, { status: CLIENT_RESPONSE_STATUS }) }),
    prisma.notificaFacilNotification.count({ where: mergeWhere(generatedWhere, { status: { not: CLIENT_RESPONSE_STATUS } }) }),
    prisma.notificaFacilNotification.count({ where: chartGeneratedWhere }),
    prisma.notificaFacilNotification.count({ where: chartSentWhere }),
    prisma.notificaFacilNotification.count({ where: chartRespondedWhere }),
    mode === "historico"
      ? prisma.notificaFacilActivityLog.findMany({
          where: {
            OR: [
              { action: { contains: config.logTerm, mode: "insensitive" } },
              { details: { contains: config.logTerm, mode: "insensitive" } },
              { field_changed: { contains: config.logTerm, mode: "insensitive" } }
            ]
          },
          orderBy: { timestamp: "desc" },
          take: 40
        })
      : Promise.resolve([])
  ]);
  const grouped = mode === "notificar" || mode === "historico" || process === "regularizacao" ? groupGeneratedLotes(items) : null;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <Link href="/notifica-facil" className="btn-secondary">
        <ArrowLeft size={16} />
        Voltar ao Dashboard
      </Link>

      <section className="panel overflow-hidden">
        <div className="relative p-8 md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(0,230,118,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_60%)]" />
          <div className="relative flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-edp/25 bg-edp/10 text-edp">
                {icon || <AlertTriangle size={24} />}
              </div>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-edp/25 bg-edp/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-edp">
                  <Bell size={13} />
                  Processo Base44
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">{title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-edp-muted">{description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {process === "regularizacao" ? (
                <>
                  <ProcessLink href={config.activeHref} active={mode === "ativas"} label="Regularização" />
                </>
              ) : (
                <>
                  <ProcessLink href={config.notifyHref} active={mode === "notificar"} label="Notificações" />
                </>
              )}
              <a className="btn-secondary" href={`/api/notifica-facil/export?${exportQuery.toString()}`}>
                <Download size={16} />
                Exportar CSV
              </a>
              {canEdit && (mode === "notificar" || process === "regularizacao") ? (
                <Link className="btn-primary" href={config.newHref}>
                  <Plus size={16} />
                  Criar notificação
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Metric label={config.totalMetric} value={total} icon={<AlertTriangle size={22} />} />
        <Metric label={config.waitingMetric} value={aguardando} icon={<Clock3 size={22} />} />
        <Metric label={config.notifiedMetric} value={notificados} icon={<CheckCircle2 size={22} />} />
        <Metric label={config.withDateMetric} value={comData} icon={<FileText size={22} />} />
        <Metric label="Com resposta do cliente" value={respondidas} icon={<CheckCircle2 size={22} />} />
        <Metric label="Sem resposta do cliente" value={semRespostaCliente} icon={<Clock3 size={22} />} />
      </section>

      <NotificaFacilNotificationChart
        title={process === "regularizacao" ? "Gráfico de notificações de regularização" : "Gráfico de notificações de pendência técnica"}
        description="Comparativo entre notificações geradas, marcadas como notificadas e com resposta do cliente."
        generated={chartGenerated}
        sent={chartSent}
        responded={chartResponded}
      />

      <section className="panel p-5">
        <form className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1 space-y-2">
            <span className="label">Buscar no processo</span>
            <AutoSearchInput className="relative" defaultValue={q} placeholder="Empresa, notificação, lote, censo, protocolo, cidade..." />
          </label>
          <label className="w-full space-y-2 md:w-72">
            <span className="label">Filtro</span>
            <select name="filtro" defaultValue={filter} className="input">
              <option value="todas">Todas</option>
              <option value="notificadas">Somente notificadas</option>
              <option value="resposta-cliente">Com resposta do cliente</option>
            </select>
          </label>
          <button className="btn-primary h-[42px]">Filtrar</button>
          {q || filter !== "todas" ? <Link className="btn-secondary h-[42px]" href={modeHref(mode, process)}>Limpar</Link> : null}
        </form>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-6 py-5">
          <h2 className="text-xl font-bold text-white">{mode === "historico" ? config.historyTitle : config.listTitle}</h2>
          <p className="mt-1 text-sm text-edp-muted">
            {mode === "notificar" || process === "regularizacao" ? config.generatedDescription : "Registros normalizados da base Base44 do Notifica Fácil."}
          </p>
        </div>
        <div className="px-6 pt-4 text-xs font-semibold text-edp">
          Mostrando {items.length} de {filteredTotal} registro(s) do filtro atual.
        </div>
        {grouped ? (
          <div className="space-y-5 p-6">
            <LoteCards lotes={grouped.lotes} canEdit={canEdit} mode={mode} process={process} />
            {grouped.individuais.length ? (
              <div className="overflow-hidden rounded-2xl border border-line">
                <div className="border-b border-line bg-surface/60 px-5 py-4">
                  <h3 className="font-bold text-white">Registros ainda sem lote</h3>
                  <p className="mt-1 text-xs text-edp-muted">Registros que ainda não foram agrupados em uma notificação.</p>
                </div>
                <PendenciasTable items={grouped.individuais} canEdit={canEdit} mode={mode} process={process} />
              </div>
            ) : null}
            {!grouped.lotes.length && !grouped.individuais.length ? (
              <div className="px-5 py-12 text-center text-edp-muted">{config.emptyText}</div>
            ) : null}
          </div>
        ) : (
          <PendenciasTable items={items} canEdit={canEdit} mode={mode} process={process} />
        )}
      </section>

      {mode === "historico" ? (
        <section className="panel p-6">
          <h2 className="text-xl font-bold text-white">Logs do processo</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {logs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="font-bold text-white">{log.action}</div>
                <div className="mt-1 text-xs text-edp-muted">{formatDateTime(log.timestamp)} - {log.user_name || log.user_email}</div>
                <div className="mt-2 text-sm text-edp-muted">{log.details || log.field_changed || "Registro de alteração"}</div>
              </div>
            ))}
            {logs.length === 0 ? <p className="text-sm text-edp-muted">Nenhum log de {config.logTerm} registrado.</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function LoteCards({
  lotes,
  canEdit,
  mode,
  process
}: {
  lotes: ReturnType<typeof groupGeneratedLotes>["lotes"];
  canEdit: boolean;
  mode: Mode;
  process: ProcessKind;
}) {
  const config = processConfigs[process];
  return (
    <div className="space-y-4">
      {lotes.map((lote) => (
        <article key={lote.loteId} className="overflow-hidden rounded-2xl border border-edp/25 bg-gradient-to-br from-edp/10 via-surface/90 to-card shadow-lg shadow-black/10">
          <div className="flex flex-col justify-between gap-5 p-5 lg:flex-row">
            <div className="flex gap-4">
              <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-edp/30 bg-edp/10 text-edp">
                <FileText size={21} />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-edp">{config.batchLabel}</div>
                <h3 className="mt-1 text-xl font-bold text-white">{lote.nome}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-edp-muted">
                  <span className="rounded-full bg-edp px-3 py-1 font-bold text-edp-navy">{lote.rows.length} notificação(ões)</span>
                  <span className="rounded-full border border-white/10 px-3 py-1">Criado em {formatDateTime(lote.created_date)}</span>
                  {lote.cidades.length ? <span className="rounded-full border border-white/10 px-3 py-1">{lote.cidades.slice(0, 3).join(", ")}</span> : null}
                </div>
                {lote.last_downloaded_at ? (
                  <div className="mt-3 inline-flex rounded-xl border border-edp/25 bg-edp/10 px-3 py-2 text-xs text-edp">
                    <CheckCircle2 className="mr-2" size={15} />
                    <span><strong className="block">Lote baixado</strong>Por {lote.last_downloaded_by || "sistema"} em {formatDateTime(lote.last_downloaded_at)}</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-2 lg:justify-end">
              <a href={`/api/notifica-facil/lotes/${encodeURIComponent(lote.loteId)}/pdf`} className="btn-primary">
                <Download size={16} />
                Baixar lote
              </a>
            </div>
          </div>

          <details className="border-t border-line bg-white/[0.03]">
            <summary className="cursor-pointer px-5 py-4 text-sm font-bold text-edp transition hover:bg-edp/10">
              Abrir lote e ver notificações
            </summary>
            <PendenciasTable items={lote.rows} canEdit={canEdit} mode={mode} process={process} compact />
          </details>
        </article>
      ))}
    </div>
  );
}

function PendenciasTable({
  items,
  canEdit,
  mode,
  process,
  compact
}: {
  items: PendenciaItem[];
  canEdit: boolean;
  mode: Mode;
  process: ProcessKind;
  compact?: boolean;
}) {
  const config = processConfigs[process];
  return (
    <div className="table-scroll">
      <table className="w-full min-w-[1080px] text-left text-sm">
        <thead>
          <tr>
            <th className="px-5 py-4 font-semibold">Notificação</th>
            <th className="px-5 py-4 font-semibold">Empresa</th>
            <th className="px-5 py-4 font-semibold">Registro censo</th>
            <th className="px-5 py-4 font-semibold">Cidade</th>
            <th className="px-5 py-4 font-semibold">Status</th>
            <th className="px-5 py-4 font-semibold">{config.statusColumn}</th>
            <th className="px-5 py-4 font-semibold">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.length ? items.map((item) => {
            const isNotified = process === "regularizacao" ? item.regularizacao_notificada : item.pt_notificado;
            const notifiedDate = process === "regularizacao" ? item.regularizacao_data_notificada : item.pt_data_notificado;
            const markAction = process === "regularizacao"
              ? markNotificaFacilRegularizacaoNotificada.bind(null, item.id)
              : markNotificaFacilPtNotificado.bind(null, item.id);
            const unmarkAction = process === "regularizacao"
              ? unmarkNotificaFacilRegularizacaoNotificada.bind(null, item.id)
              : unmarkNotificaFacilPtNotificado.bind(null, item.id);

            return (
              <tr key={item.id} className="border-t border-line">
                <td className="px-5 py-4">
                  <Link href={`/notifica-facil/${item.id}?from=${encodeURIComponent(modeHref(mode, process))}`} className="font-bold text-edp hover:text-edp-hover">
                    {item.numero_notificacao || item.numero_protocolo || item.id}
                  </Link>
                  <div className="mt-1 text-xs text-edp-muted">{formatDate(item.updated_date)}</div>
                  {!compact && (item.lote_nome || item.lote_id) ? (
                    <div className="mt-2 inline-flex rounded-full border border-edp/25 bg-edp/10 px-2 py-1 text-[11px] font-bold text-edp">
                      Lote: {item.lote_nome || item.lote_id}
                    </div>
                  ) : null}
                </td>
                <td className="px-5 py-4 text-white">{item.empresa}</td>
                <td className="px-5 py-4 text-edp-muted">{item.numero_registro_censo || "-"}</td>
                <td className="px-5 py-4 text-edp-muted">{notificaFacilAddressCity(item.enderecos_revelia, item.empresa_cidade)}</td>
                <td className="px-5 py-4"><StatusBadge value={item.status} /></td>
                <td className="px-5 py-4">
                  <div className="space-y-1">
                    <SmallBadge tone={isNotified ? "green" : "yellow"} label={isNotified ? config.notifiedLabel : config.waitingLabel} />
                    <div className="text-xs text-edp-muted">{notifiedDate || config.noDateLabel}</div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/notifica-facil/${item.id}?from=${encodeURIComponent(modeHref(mode, process))}`} className="btn-secondary h-9 px-3 text-xs">Abrir</Link>
                    {item.numero_notificacao ? (
                      <a href={`/api/notifica-facil/notifications/${item.id}/pdf`} className="btn-secondary h-9 px-3 text-xs">
                        <Download size={14} />
                        PDF
                      </a>
                    ) : null}
                    {canEdit && !isNotified ? (
                      <form action={markAction}>
                        <button className="btn-primary h-9 px-3 text-xs" type="submit">{config.markLabel}</button>
                      </form>
                    ) : null}
                    {canEdit && mode === "historico" && isNotified ? (
                      <form action={unmarkAction}>
                        <button className="btn-secondary h-9 px-3 text-xs" type="submit">Voltar para aguardando</button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center text-edp-muted">{config.emptyText}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function modeHref(mode: Mode, process: ProcessKind) {
  const config = processConfigs[process];
  if (mode === "historico") return config.historyHref;
  if (mode === "notificar") return config.notifyHref;
  return config.activeHref;
}

function normalizeListFilter(value: string | undefined): ListFilter {
  return value === "notificadas" || value === "resposta-cliente" ? value : "todas";
}

function ProcessLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link className={active ? "btn-primary" : "btn-secondary"} href={href}>
      {label}
    </Link>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-edp-muted">{label}</div>
          <div className="mt-2 text-3xl font-bold text-white">{value}</div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-edp/25 bg-edp/10 text-edp">{icon}</div>
      </div>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  return <span className="inline-flex rounded-full border border-edp/25 bg-edp/10 px-3 py-1 text-xs font-bold text-edp">{value}</span>;
}

function SmallBadge({ label, tone }: { label: string; tone: "green" | "yellow" }) {
  const style = tone === "green" ? "border-edp/30 bg-edp/15 text-edp" : "border-yellow-300/30 bg-yellow-300/15 text-yellow-100";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${style}`}>{label}</span>;
}
