import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Send,
  Shield,
  Trash2,
  TrendingUp
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { updateUserPermission } from "./actions";

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
    pendentes: rows.filter((row) => row.status === "Pendente").length,
    regularizadas: rows.filter((row) => row.status === "Regularizado").length,
    analise: rows.filter((row) => row.status === "Em Análise").length,
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
  const [total, pendentes, regularizadas, vencidas, recentes, users] = await Promise.all([
    prisma.notificacao.count({ where: baseWhere }),
    prisma.notificacao.count({ where: { ...baseWhere, status: "Pendente" } }),
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

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-2xl border border-line bg-surface/60 px-6 py-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-edp">EDP</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Portal de Regularização</h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-edp-muted">
            Painel executivo para acompanhamento de notificações, lotes, downloads e permissões operacionais.
          </p>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total de Notificações" value={total} icon={<FileText size={26} />} tone="blue" />
        <MetricCard label="Pendentes" value={pendentes} icon={<Clock size={28} />} tone="amber" />
        <MetricCard label="Regularizadas" value={regularizadas} icon={<CheckCircle2 size={28} />} tone="green" />
        <MetricCard label="Vencidas" value={vencidas} icon={<AlertTriangle size={28} />} tone="red" />
      </section>

      <section className="rounded-2xl border border-line bg-card p-2">
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <TabLink href="/" active={activeTab === "notificacoes"} icon={<FileText size={16} />}>Notificações</TabLink>
          <TabLink href="/?tab=relatorios" active={activeTab === "relatorios"} icon={<TrendingUp size={16} />}>Relatórios</TabLink>
          <TabLink href="/?tab=permissoes" active={activeTab === "permissoes"} icon={<Shield size={16} />}>Permissões</TabLink>
        </div>
      </section>

      {activeTab === "notificacoes" ? <NotificationsPanel total={total} lotes={lotes} /> : null}
      {activeTab === "relatorios" ? <ReportsPanel total={total} pendentes={pendentes} regularizadas={regularizadas} /> : null}
      {activeTab === "permissoes" ? <PermissionsPanel users={users} /> : null}
    </div>
  );
}

function NotificationsPanel({ total, lotes }: { total: number; lotes: ReturnType<typeof groupLotes> }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <div className="mb-5 flex items-center gap-3">
        <Clock className="text-edp" size={22} />
        <h1 className="text-xl font-bold text-white">Notificações Recentes ({total})</h1>
      </div>

      <form action="/notificacoes" className="mb-6 space-y-3">
        <div className="relative">
          <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input className="field h-11 pl-11" name="q" placeholder="Buscar por empresa, CNPJ, contrato, nº ofício, endereço, observações..." />
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <select className="field" name="status"><option value="">Todos Status</option><option>Pendente</option><option>Regularizado</option><option>Vencido</option></select>
          <select className="field" name="tipo"><option value="">Todos Tipos</option></select>
          <select className="field" name="origem"><option value="">Todas</option><option>manual</option><option>importacao</option></select>
          <select className="field" name="arquivada"><option value="">Não Arquivadas</option><option value="true">Arquivadas</option></select>
          <select className="field" name="ordem"><option value="">Mais Recentes</option></select>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label><span className="label">Data Início</span><input className="field mt-1" type="date" name="inicio" /></label>
          <label><span className="label">Data Fim</span><input className="field mt-1" type="date" name="fim" /></label>
          <div className="flex items-end"><button className="btn-secondary h-10 min-w-32">Limpar</button></div>
        </div>
      </form>

      <div className="space-y-4">
        {lotes.map((lote) => (
          <article key={lote.nome} className="overflow-hidden rounded-2xl border border-line bg-surface/70">
            <div className="flex flex-col justify-between gap-4 p-5 lg:flex-row">
              <div className="flex gap-4">
                <div className="mt-8 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-edp/30 bg-edp/10 text-edp"><FileText size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold text-white">{lote.nome}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-edp-muted">
                    <span className="rounded-full bg-edp px-3 py-1 font-bold text-edp-navy">{lote.rows.length} notificações</span>
                    <span>{formatDateTime(lote.created_date)}</span>
                  </div>
                  {lote.baixado ? (
                    <div className="mt-3 inline-flex rounded-xl border border-edp/25 bg-edp/10 px-3 py-2 text-xs text-edp">
                      <CheckCircle2 className="mr-2" size={15} />
                      <span><strong className="block">Lote Baixado</strong>Por {lote.last_downloaded_by || "sistema"} em {formatDateTime(lote.last_downloaded_at)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <Link href={`/notificacoes?lote=${encodeURIComponent(lote.nome)}`} className="btn-secondary"><Send size={16} />Enviar Portal</Link>
                <Link href={`/api/downloads/lote?lote_id=${encodeURIComponent(lote.loteId)}`} className="btn-primary"><Download size={16} />Baixar PDFs</Link>
                <button className="btn bg-red-500 px-3 text-white hover:bg-red-600" title="Excluir lote"><Trash2 size={16} /></button>
              </div>
            </div>

            <div className="mx-5 mb-4 grid max-w-3xl grid-cols-2 rounded-xl border border-line bg-edp-navy/35 text-sm md:grid-cols-4">
              <StatusMetric label="Pendentes" value={lote.pendentes} className="text-amber-200" />
              <StatusMetric label="Regularizadas" value={lote.regularizadas} className="text-edp" />
              <StatusMetric label="Em Análise" value={lote.analise} className="text-violet-200" />
              <StatusMetric label="Vencidas" value={lote.vencidas} className="text-red-200" />
            </div>

            <Link href={`/notificacoes?lote=${encodeURIComponent(lote.nome)}`} className="mx-5 mb-5 flex items-center justify-between rounded-xl border border-line bg-white/[0.04] px-4 py-3 text-sm font-medium text-edp">
              Ver empresas neste lote
              <span>⌄</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReportsPanel({ total, pendentes, regularizadas }: { total: number; pendentes: number; regularizadas: number }) {
  const pendentePct = total > 0 ? Math.round((pendentes / total) * 100) : 0;
  const regularizadaPct = total > 0 ? Math.round((regularizadas / total) * 100) : 0;
  const gradient = `conic-gradient(#fbbf24 0 ${pendentePct}%, #00E676 ${pendentePct}% ${pendentePct + regularizadaPct}%, rgba(255,255,255,0.08) ${pendentePct + regularizadaPct}% 100%)`;

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
          <span className="absolute left-[28%] top-[38%] text-sm text-amber-200">Pendente ({pendentePct}%)</span>
          <div className="h-60 w-60 rounded-full" style={{ background: gradient }} />
          <span className="absolute right-[28%] top-[47%] text-sm text-edp">Regularizado ({regularizadaPct}%)</span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <ReportSummary label="Total Filtrado" value={total} className="text-edp" />
        <ReportSummary label="Visualizadas" value={0} className="text-emerald-600" />
        <ReportSummary label="Pendentes" value={pendentes} className="text-amber-600" />
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
        <p className="mt-2 text-sm text-edp-muted">Ative para permitir que o usuário edite o banco de dados na página "Importar Dados"</p>
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

function MetricCard({ label, value, icon, tone }: { label: string; value: number; icon: ReactNode; tone: "blue" | "amber" | "green" | "red" }) {
  const tones = {
    blue: "border-sky-300/20 bg-sky-300/10 text-sky-200",
    amber: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    green: "border-edp/30 bg-edp/10 text-edp",
    red: "border-red-300/20 bg-red-400/10 text-red-200"
  };
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-card px-6 py-5">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-edp-muted">{label}</div>
        <div className="mt-2 text-3xl font-bold text-white">{value}</div>
      </div>
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${tones[tone]}`}>{icon}</div>
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
