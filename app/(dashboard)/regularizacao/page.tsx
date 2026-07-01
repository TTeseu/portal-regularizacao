import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Filter,
  Send,
  Shield,
  Trash2,
  TrendingUp,
  Zap
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { AutoSearchInput } from "@/components/auto-search-input";
import { LEGACY_NOTIFICADO_STATUSES, STATUS_OPTIONS } from "@/lib/constants";
import { deleteLoteNotificacoes, updateLoteNotificacoesStatus, updateUserPermission } from "../actions";

type DashboardTab = "notificacoes" | "relatorios" | "permissoes";

type LoteItem = {
  id: string;
  lote_nome: string | null;
  lote_id: string | null;
  empresa: string | null;
  status: string;
  created_date: Date | null;
  download_count: number;
  last_downloaded_at: Date | null;
  last_downloaded_by: string | null;
};

function groupLotes(items: LoteItem[]) {
  const map = new Map<string, LoteItem[]>();
  for (const item of items) {
    const key = item.lote_nome || item.lote_id || "Sem lote";
    map.set(key, [...(map.get(key) || []), item]);
  }
  return Array.from(map.entries()).slice(0, 10).map(([nome, rows]) => ({
    nome,
    loteId: rows[0]?.lote_id || nome,
    rows,
    notificados: rows.filter((row) => (LEGACY_NOTIFICADO_STATUSES as readonly string[]).includes(row.status)).length,
    regularizadas: rows.filter((row) => row.status === "Regularizado").length,
    vencidas: rows.filter((row) => row.status === "Vencido").length,
    baixado: rows.some((row) => row.download_count > 0),
    created_date: rows[0]?.created_date,
    last_downloaded_at: rows.find((row) => row.last_downloaded_at)?.last_downloaded_at,
    last_downloaded_by: rows.find((row) => row.last_downloaded_by)?.last_downloaded_by
  }));
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) || {};
  const activeTab = (params.tab === "relatorios" || params.tab === "permissoes" ? params.tab : "notificacoes") as DashboardTab;
  const baseWhere = { arquivada: false, pdfUrl: { not: null } };
  const [total, notificados, regularizadas, vencidas, recentes, users] = await Promise.all([
    prisma.notificacao.count({ where: baseWhere }),
    prisma.notificacao.count({ where: { ...baseWhere, status: { in: [...LEGACY_NOTIFICADO_STATUSES] } } }),
    prisma.notificacao.count({ where: { ...baseWhere, status: "Regularizado" } }),
    prisma.notificacao.count({ where: { ...baseWhere, status: "Vencido" } }),
    prisma.notificacao.findMany({
      where: baseWhere,
      orderBy: [{ created_date: "desc" }, { id: "desc" }],
      take: 250,
      select: {
        id: true,
        lote_nome: true,
        lote_id: true,
        empresa: true,
        status: true,
        created_date: true,
        download_count: true,
        last_downloaded_at: true,
        last_downloaded_by: true
      }
    }),
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { full_name: "asc" }, { email: "asc" }],
      select: { id: true, full_name: true, email: true, role: true, pode_editar_importar: true }
    })
  ]);

  const lotes = groupLotes(recentes);
  const regularizacaoPct = total > 0 ? Math.round((regularizadas / total) * 100) : 0;
  const notificadosPct = total > 0 ? Math.round((notificados / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section
        className="relative min-h-[310px] overflow-hidden rounded-[28px] border border-white/10 bg-cover bg-center px-7 py-8 shadow-2xl shadow-black/20 md:px-10 md:py-10"
        style={{ backgroundImage: "linear-gradient(90deg, rgba(20,31,49,0.96) 0%, rgba(20,31,49,0.84) 46%, rgba(20,31,49,0.58) 100%), url('/edp-energy-hero.svg')" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(0,230,118,0.18),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_32%)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-edp/70 to-transparent" />
        <div className="relative flex h-full flex-col justify-between gap-10">
          <div className="max-w-3xl">
            <img src="/edp-logo-white.svg" alt="EDP" className="h-10 w-auto" />
            <h1 className="mt-8 text-4xl font-bold leading-tight text-white md:text-5xl">Portal de Regularização</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-edp-muted md:text-lg">
              Gestão de notificações, compartilhamento de infraestrutura e acompanhamento operacional
            </p>
          </div>
          <div className="grid gap-3 text-sm text-edp-muted md:grid-cols-3">
            <HeroSignal label="Infraestrutura" value="Compartilhamento de postes" />
            <HeroSignal label="Operação" value={`${lotes.length} lotes recentes em acompanhamento`} />
            <HeroSignal label="Eficiência" value={`${regularizacaoPct}% regularizadas`} />
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total de Notificações" value={total} context="Base operacional ativa" icon={<Zap size={26} />} tone="blue" />
        <MetricCard label="Notificados" value={notificados} context={`${notificadosPct}% em acompanhamento`} icon={<Clock size={28} />} tone="amber" />
        <MetricCard label="Regularizadas" value={regularizadas} context={`${regularizacaoPct}% concluídas`} icon={<CheckCircle2 size={28} />} tone="green" />
        <MetricCard label="Vencidas" value={vencidas} context="Monitoramento crítico" icon={<AlertTriangle size={28} />} tone="red" />
      </section>

      <section className="rounded-2xl border border-line bg-card/95 p-2 shadow-xl shadow-black/10">
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <TabLink href="/regularizacao" active={activeTab === "notificacoes"} icon={<FileText size={16} />}>Notificações</TabLink>
          <TabLink href="/regularizacao?tab=relatorios" active={activeTab === "relatorios"} icon={<TrendingUp size={16} />}>Relatórios</TabLink>
          <TabLink href="/regularizacao?tab=permissoes" active={activeTab === "permissoes"} icon={<Shield size={16} />}>Permissões</TabLink>
        </div>
      </section>

      {activeTab === "notificacoes" ? <NotificationsPanel total={total} lotes={lotes} /> : null}
      {activeTab === "relatorios" ? <ReportsPanel total={total} notificados={notificados} regularizadas={regularizadas} vencidas={vencidas} /> : null}
      {activeTab === "permissoes" ? <PermissionsPanel users={users} /> : null}
    </div>
  );
}

function NotificationsPanel({ total, lotes }: { total: number; lotes: ReturnType<typeof groupLotes> }) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-line bg-card/95 shadow-xl shadow-black/10">
      <div className="border-b border-line bg-surface/70 px-6 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-edp/25 bg-edp/10 text-edp">
              <Activity size={22} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white">Notificações Recentes ({total})</h1>
              <p className="mt-1 text-sm text-edp-muted">Lotes ativos, histórico de baixa e acompanhamento operacional</p>
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-edp">
            Últimos 250 registros
          </div>
        </div>
      </div>

      <form action="/notificacoes" className="space-y-4 border-b border-line px-6 py-5">
        <AutoSearchInput
          targetPath="/notificacoes"
          className="relative"
          inputClassName="field h-11 pl-11"
          placeholder="Buscar por empresa, CNPJ, contrato, nº ofício, endereço, observações..."
        />
        <div className="rounded-2xl border border-line bg-edp-navy/25 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-edp-muted">
            <Filter size={14} className="text-edp" />
            Filtros operacionais
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <select className="field" name="status"><option value="">Todos Status</option>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select>
            <select className="field" name="tipo"><option value="">Todos Tipos</option></select>
            <select className="field" name="origem"><option value="">Todas</option><option>manual</option><option>importacao</option></select>
            <select className="field" name="arquivada"><option value="">Não Arquivadas</option><option value="true">Arquivadas</option></select>
            <select className="field" name="ordem"><option value="">Mais Recentes</option></select>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label><span className="label">Data Início</span><input className="field mt-1" type="date" name="inicio" /></label>
          <label><span className="label">Data Fim</span><input className="field mt-1" type="date" name="fim" /></label>
          <div className="flex items-end"><button className="btn-secondary h-10 min-w-32">Limpar</button></div>
        </div>
      </form>

      <div className="space-y-4 p-6">
        {lotes.map((lote) => (
          <article key={lote.nome} className="overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-br from-surface/95 to-card shadow-lg shadow-black/10">
            <div className="flex flex-col justify-between gap-5 p-5 lg:flex-row">
              <div className="flex gap-4">
                <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-edp/30 bg-edp/10 text-edp shadow-lg shadow-edp/5"><FileText size={21} /></div>
                <div>
                  <h2 className="text-lg font-bold text-white md:text-xl">{lote.nome}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-edp-muted">
                    <span className="rounded-full bg-edp px-3 py-1 font-bold text-edp-navy">{lote.rows.length} notificações</span>
                    <span className="rounded-full border border-white/10 px-3 py-1">{formatDateTime(lote.created_date)}</span>
                  </div>
                  {lote.baixado ? (
                    <div className="mt-3 inline-flex rounded-xl border border-edp/25 bg-edp/10 px-3 py-2 text-xs text-edp">
                      <CheckCircle2 className="mr-2" size={15} />
                      <span><strong className="block">Lote Baixado</strong>Por {lote.last_downloaded_by || "sistema"} em {formatDateTime(lote.last_downloaded_at)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                <Link href={`/notificacoes?lote=${encodeURIComponent(lote.nome)}`} className="btn-secondary"><Send size={16} />Enviar Portal</Link>
                <Link href={`/api/downloads/lote?lote_id=${encodeURIComponent(lote.loteId)}`} className="btn-primary"><Download size={16} />Baixar PDFs</Link>
                <form action={deleteLoteNotificacoes.bind(null, lote.loteId)}>
                  <input type="hidden" name="redirect_to" value="/regularizacao" />
                  <button className="btn bg-red-500 px-3 text-white hover:bg-red-600" title="Excluir lote">
                    <Trash2 size={16} />
                  </button>
                </form>
              </div>
            </div>

            <div className="mx-5 mb-4 grid max-w-3xl grid-cols-1 overflow-hidden rounded-2xl border border-line bg-edp-navy/35 text-sm md:grid-cols-3">
              <StatusMetric label="Notificados" value={lote.notificados} className="text-sky-200" />
              <StatusMetric label="Regularizadas" value={lote.regularizadas} className="text-edp" />
              <StatusMetric label="Vencidas" value={lote.vencidas} className="text-red-200" />
            </div>

            <div className="mx-5 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white/[0.03] px-4 py-3">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-edp-muted">Status rápido do lote</span>
              {STATUS_OPTIONS.map((status) => (
                <form key={status} action={updateLoteNotificacoesStatus.bind(null, lote.loteId)}>
                  <input type="hidden" name="status" value={status} />
                  <input type="hidden" name="redirect_to" value="/regularizacao" />
                  <button className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:border-edp/50 hover:bg-edp/10 hover:text-edp">
                    {status}
                  </button>
                </form>
              ))}
            </div>

            <Link href={`/notificacoes?lote=${encodeURIComponent(lote.nome)}`} className="mx-5 mb-5 flex items-center justify-between rounded-2xl border border-line bg-white/[0.04] px-4 py-3 text-sm font-semibold text-edp transition hover:border-edp/35 hover:bg-edp/10">
              Ver empresas neste lote
              <span>⌄</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReportsPanel({ total, notificados, regularizadas, vencidas }: { total: number; notificados: number; regularizadas: number; vencidas: number }) {
  const notificadoPct = total > 0 ? Math.round((notificados / total) * 100) : 0;
  const regularizadaPct = total > 0 ? Math.round((regularizadas / total) * 100) : 0;
  const vencidaPct = total > 0 ? Math.max(0, 100 - notificadoPct - regularizadaPct) : 0;
  const gradient = `conic-gradient(#38bdf8 0 ${notificadoPct}%, #00E676 ${notificadoPct}% ${notificadoPct + regularizadaPct}%, #f87171 ${notificadoPct + regularizadaPct}% ${notificadoPct + regularizadaPct + vencidaPct}%, rgba(255,255,255,0.08) ${notificadoPct + regularizadaPct + vencidaPct}% 100%)`;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-card">
        <div className="flex flex-col justify-between gap-4 border-b border-line px-6 py-5 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-edp" size={20} />
            <h1 className="text-xl font-bold text-white">Relatórios e Analytics</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary"><Download size={16} />Exportar Gráfico</button>
            <Link className="btn-primary" href="/api/downloads/todos"><FileText size={16} />Exportar Dados Completos</Link>
          </div>
        </div>
        <div className="grid gap-3 p-6 md:grid-cols-2">
          <select className="field"><option>Todos os Períodos</option></select>
          <select className="field"><option>Por Status</option></select>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className="flex items-center gap-3 border-b border-line bg-surface px-6 py-5">
          <Clock className="text-edp" size={20} />
          <h2 className="text-lg font-bold text-white">Distribuição por Status</h2>
          <span className="text-sm text-edp-muted">({total} notificações)</span>
        </div>
        <div className="relative flex min-h-[390px] items-center justify-center">
          <span className="absolute left-[28%] top-[38%] text-sm text-sky-200">Notificado ({notificadoPct}%)</span>
          <div className="h-60 w-60 rounded-full" style={{ background: gradient }} />
          <span className="absolute right-[28%] top-[47%] text-sm text-edp">Regularizado ({regularizadaPct}%)</span>
          <span className="absolute bottom-[20%] right-[36%] text-sm text-red-200">Vencido ({vencidas})</span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <ReportSummary label="Total Filtrado" value={total} className="text-edp" />
        <ReportSummary label="Vencidas" value={vencidas} className="text-red-300" />
        <ReportSummary label="Notificados" value={notificados} className="text-sky-300" />
        <ReportSummary label="Regularizadas" value={regularizadas} className="text-emerald-600" />
      </section>
    </div>
  );
}

function PermissionsPanel({
  users
}: {
  users: Array<{ id: string; full_name: string | null; email: string; role: string; pode_editar_importar: boolean }>;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="border-b border-line px-6 py-6">
        <div className="flex items-center gap-3">
          <Shield className="text-edp" size={22} />
          <h1 className="text-xl font-bold text-white">Permissões de Edição — Importar Dados</h1>
        </div>
        <p className="mt-2 text-sm text-edp-muted">Ative para permitir que o usuário edite o banco de dados na página &quot;Importar Dados&quot;</p>
      </div>
      <div className="divide-y divide-line px-6 py-4">
        {users.map((user) => {
          const initial = (user.full_name || user.email).slice(0, 1).toUpperCase();
          const canEdit = user.pode_editar_importar || user.role === "admin";
          return (
            <div key={user.id} className="flex items-center justify-between gap-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-edp/30 bg-edp/10 font-bold text-edp">{initial}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-bold text-white">{user.full_name || user.email}</div>
                    {user.role === "admin" ? <span className="rounded-full border border-edp/30 bg-edp/10 px-2 py-0.5 text-xs font-bold text-edp">Admin</span> : null}
                  </div>
                  <div className="truncate text-sm text-edp-muted">{user.email}</div>
                </div>
              </div>
              <form action={updateUserPermission.bind(null, user.id)} className="flex items-center gap-3">
                <input type="hidden" name="role" value={user.role} />
                {!canEdit ? <input type="hidden" name="pode_editar_importar" value="true" /> : null}
                <span className="text-sm text-edp-muted">{canEdit ? "Pode editar/importar" : "Somente leitura"}</span>
                <button
                  className={`relative h-5 w-9 rounded-full transition ${canEdit ? "bg-edp" : "bg-white/15"}`}
                  title={canEdit ? "Remover permissão" : "Ativar permissão"}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${canEdit ? "left-4" : "left-0.5"}`} />
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TabLink({ href, active, icon, children }: { href: string; active: boolean; icon: ReactNode; children: ReactNode }) {
  return (
    <Link href={href} className={active ? "btn bg-edp text-edp-navy hover:bg-edp-hover" : "btn border-transparent text-edp-muted hover:bg-white/[0.06] hover:text-white"}>
      {icon}
      {children}
    </Link>
  );
}

function HeroSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-edp">
        <Activity size={14} />
        {label}
      </div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function MetricCard({ label, value, context, icon, tone }: { label: string; value: number; context: string; icon: ReactNode; tone: "blue" | "amber" | "green" | "red" }) {
  const tones = {
    blue: "border-sky-300/25 bg-sky-300/10 text-sky-200 shadow-sky-950/20",
    amber: "border-amber-300/25 bg-amber-300/10 text-amber-200 shadow-amber-950/20",
    green: "border-edp/35 bg-edp/10 text-edp shadow-emerald-950/20",
    red: "border-red-300/25 bg-red-400/10 text-red-200 shadow-red-950/20"
  };
  return (
    <div className="group relative overflow-hidden rounded-[22px] border border-line bg-gradient-to-br from-card to-surface px-6 py-5 shadow-xl shadow-black/10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-edp/5 blur-2xl transition group-hover:bg-edp/10" />
      <div className="pr-16">
        <div className="text-xs font-semibold uppercase tracking-wide text-edp-muted">{label}</div>
        <div className="mt-2 text-3xl font-bold text-white">{value}</div>
        <div className="mt-3 text-xs font-medium text-edp-muted">{context}</div>
      </div>
      <div className={`absolute right-5 top-5 flex h-14 w-14 items-center justify-center rounded-2xl border shadow-lg ${tones[tone]}`}>{icon}</div>
    </div>
  );
}

function StatusMetric({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="px-4 py-4">
      <div className={`text-xs font-semibold ${className}`}>{label}</div>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function ReportSummary({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-6 py-4 text-center">
      <div className="text-sm text-edp-muted">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${className}`}>{value}</div>
    </div>
  );
}
