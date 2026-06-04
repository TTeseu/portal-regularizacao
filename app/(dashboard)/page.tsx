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

export default async function DashboardPage() {
  const baseWhere = { arquivada: false, pdfUrl: { not: null } };
  const [total, pendentes, regularizadas, vencidas, recentes] = await Promise.all([
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
    })
  ]);

  const lotes = groupLotes(recentes);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total de Notificações" value={total} icon={<FileText size={26} />} tone="blue" />
        <MetricCard label="Pendentes" value={pendentes} icon={<Clock size={28} />} tone="amber" />
        <MetricCard label="Regularizadas" value={regularizadas} icon={<CheckCircle2 size={28} />} tone="green" />
        <MetricCard label="Vencidas" value={vencidas} icon={<AlertTriangle size={28} />} tone="red" />
      </section>

      <section className="rounded-lg bg-white p-2 shadow-lg shadow-slate-200/70">
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <button className="btn bg-blue-600 text-white hover:bg-blue-700">
            <FileText size={16} />
            Notificações
          </button>
          <button className="btn-secondary border-transparent">
            <TrendingUp size={16} />
            Relatórios
          </button>
          <button className="btn-secondary border-transparent">
            <Shield size={16} />
            Permissões
          </button>
        </div>
      </section>

      <section className="bg-white p-6 shadow-lg shadow-slate-200/60">
        <div className="mb-5 flex items-center gap-3">
          <Clock className="text-blue-600" size={22} />
          <h1 className="text-xl font-extrabold text-slate-950">Notificações Recentes ({total})</h1>
        </div>

        <form action="/notificacoes" className="mb-6 space-y-3">
          <div className="relative">
            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="field h-11 pl-11"
              name="q"
              placeholder="Buscar por empresa, CNPJ, contrato, nº ofício, endereço, observações..."
            />
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <select className="field" name="status"><option value="">Todos Status</option><option>Pendente</option><option>Regularizado</option><option>Vencido</option></select>
            <select className="field" name="tipo"><option value="">Todos Tipos</option></select>
            <select className="field" name="origem"><option value="">Todas</option><option>manual</option><option>importacao</option></select>
            <select className="field" name="arquivada"><option value="">Não Arquivadas</option><option value="true">Arquivadas</option></select>
            <select className="field" name="ordem"><option value="">Mais Recentes</option></select>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label>
              <span className="text-xs font-semibold text-slate-700">Data Início</span>
              <input className="field mt-1" type="date" name="inicio" />
            </label>
            <label>
              <span className="text-xs font-semibold text-slate-700">Data Fim</span>
              <input className="field mt-1" type="date" name="fim" />
            </label>
            <div className="flex items-end">
              <button className="btn-secondary h-10 min-w-32">Limpar</button>
            </div>
          </div>
        </form>

        <div className="space-y-4">
          {lotes.map((lote) => (
            <article key={lote.nome} className="overflow-hidden rounded-lg border border-violet-300 bg-violet-100/80 shadow-md shadow-violet-100">
              <div className="flex flex-col justify-between gap-4 p-5 lg:flex-row">
                <div className="flex gap-4">
                  <div className="mt-8 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-violet-950">{lote.nome}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-violet-800">
                      <span className="rounded bg-violet-700 px-2 py-1 font-bold text-white">{lote.rows.length} notificações</span>
                      <span>{formatDateTime(lote.created_date)}</span>
                    </div>
                    {lote.baixado ? (
                      <div className="mt-3 inline-flex rounded-md bg-emerald-100 px-3 py-2 text-xs text-emerald-800">
                        <CheckCircle2 className="mr-2" size={15} />
                        <span>
                          <strong className="block">Lote Baixado</strong>
                          Por {lote.last_downloaded_by || "sistema"} em {formatDateTime(lote.last_downloaded_at)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <Link href={`/notificacoes?lote=${encodeURIComponent(lote.nome)}`} className="btn bg-blue-600 text-white hover:bg-blue-700">
                    <Send size={16} />
                    Enviar Portal
                  </Link>
                  <Link href={`/api/downloads/lote?lote=${encodeURIComponent(lote.nome)}`} className="btn bg-violet-600 text-white hover:bg-violet-700">
                    <Download size={16} />
                    Baixar PDFs
                  </Link>
                  <button className="btn bg-red-500 px-3 text-white hover:bg-red-600" title="Excluir lote">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mx-5 mb-4 grid max-w-3xl grid-cols-2 rounded-md bg-white/60 text-sm md:grid-cols-4">
                <StatusMetric label="Pendentes" value={lote.pendentes} className="text-violet-700" />
                <StatusMetric label="Regularizadas" value={lote.regularizadas} className="text-emerald-700" />
                <StatusMetric label="Em Análise" value={lote.analise} className="text-orange-600" />
                <StatusMetric label="Vencidas" value={lote.vencidas} className="text-red-600" />
              </div>

              <Link href={`/notificacoes?lote=${encodeURIComponent(lote.nome)}`} className="mx-5 mb-5 flex items-center justify-between rounded-md bg-white/70 px-4 py-3 text-sm font-medium text-violet-800">
                Ver empresas neste lote
                <span>⌄</span>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, icon, tone }: { label: string; value: number; icon: ReactNode; tone: "blue" | "amber" | "green" | "red" }) {
  const tones = {
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-600",
    green: "bg-emerald-100 text-emerald-600",
    red: "bg-red-100 text-red-600"
  };
  return (
    <div className="flex items-center justify-between rounded-lg bg-white px-6 py-5 shadow-lg shadow-slate-200/70">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</div>
        <div className="mt-2 text-3xl font-extrabold text-slate-950">{value}</div>
      </div>
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
    </div>
  );
}

function StatusMetric({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="px-4 py-4">
      <div className={`text-xs font-semibold ${className}`}>{label}</div>
      <div className="mt-1 text-lg font-extrabold text-slate-950">{value}</div>
    </div>
  );
}
