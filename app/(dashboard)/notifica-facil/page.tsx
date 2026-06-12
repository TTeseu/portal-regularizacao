import Link from "next/link";
import type { ReactNode } from "react";
import { Prisma } from "@prisma/client";
import {
  BarChart3,
  Bell,
  Building2,
  ClipboardCheck,
  DollarSign,
  FileText,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  Users
} from "lucide-react";
import { canEdit as canEditUser, requireUser } from "@/lib/auth";
import { formatPtBrDisplay } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cnpjSearchTerm } from "@/lib/cnpj";

const statuses = [
  "Aguardando assinatura Gestor",
  "Notifica\u00e7\u00e3o Encaminhada por E-mail.",
  "Resposta do Cliente - Anexo do E-mail.",
  "Entrega do Projeto ou Projeto Pendente. (10 dias)",
  "N\u00e3o houve resposta do Cliente - Valores Informar o Faturamento.",
  "Finalizar Notifica\u00e7\u00e3o."
];

const pendenciaTecnicaWhere: Prisma.NotificaFacilNotificationWhereInput = {
  OR: [
    { pendencia_tecnica: true },
    { pt_notificado: true },
    { pt_data_notificado: { not: null } }
  ]
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default async function NotificaFacilPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const [params, user] = await Promise.all([searchParams, requireUser()]);
  const values = params || {};
  const canEdit = canEditUser(user);
  const where: Prisma.NotificaFacilNotificationWhereInput = {};

  if (values.status) where.status = values.status;
  if (values.empresa) where.empresa = { contains: values.empresa, mode: "insensitive" };
  if (values.cidade) where.empresa_cidade = { contains: values.cidade, mode: "insensitive" };
  if (values.q) {
    const q = { contains: values.q, mode: "insensitive" as const };
    const cnpj = { contains: cnpjSearchTerm(values.q), mode: "insensitive" as const };
    where.OR = [
      { empresa: q },
      { cnpj: q },
      { cnpj },
      { contrato_numero: q },
      { numero_notificacao: q },
      { numero_registro_censo: q },
      { numero_protocolo: q },
      { destinatario_nome: q },
      { empresa_cidade: q }
    ];
  }

  const [items, total, concluidas, standby, pendencias, empresas, emailEnviados, retroativoAgg, multaAgg] = await Promise.all([
    prisma.notificaFacilNotification.findMany({
      where,
      orderBy: [{ created_date: "desc" }, { id: "desc" }],
      take: 100
    }),
    prisma.notificaFacilNotification.count({ where }),
    prisma.notificaFacilNotification.count({ where: { ...where, status: "Finalizar Notifica\u00e7\u00e3o." } }),
    prisma.notificaFacilNotification.count({ where: { ...where, is_standby: true } }),
    prisma.notificaFacilNotification.count({ where: { AND: [where, pendenciaTecnicaWhere] } }),
    prisma.notificaFacilNotification.groupBy({ by: ["empresa"], where, _count: { empresa: true }, orderBy: { _count: { empresa: "desc" } } }),
    prisma.notificaFacilNotification.count({ where: { ...where, data_email_encaminhado: { not: null } } }),
    prisma.notificaFacilNotification.aggregate({ where, _sum: { valor_atualizado: true } }),
    prisma.notificaFacilNotification.aggregate({ where, _sum: { multa: true } })
  ]);

  const totalRetroativo = retroativoAgg._sum.valor_atualizado || 0;
  const totalMultas = multaAgg._sum.multa || 0;
  const naoRegularizados = Math.max(total - concluidas, 0);

  return (
    <div className="mx-auto max-w-[1500px] space-y-8">
      <section className="panel overflow-hidden">
        <div className="relative p-8 md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(0,230,118,0.22),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_55%)]" />
          <div className="relative flex flex-col justify-between gap-8 xl:flex-row xl:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-edp/25 bg-edp/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-edp">
                <Bell size={15} />
                Módulo documental
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-white md:text-5xl">Notifica Fácil</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-edp-muted">
                Backend, dados e fluxo do Base44 com identidade visual EDP: notificações do censo, pendências técnicas,
                respostas de clientes, anexos, assinaturas e acompanhamento documental.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/home" className="btn-secondary">Portal central</Link>
              {canEdit ? (
                <Link href="/notifica-facil/nova" className="btn-primary">
                  <Plus size={16} />
                  Nova notificação
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total filtrado" value={total} hint="Base documental ativa" icon={<FileText size={24} />} tone="blue" />
        <Metric label="Não regularizados" value={naoRegularizados} hint="Aguardando tratativa" icon={<ShieldAlert size={24} />} tone="yellow" />
        <Metric label="Stand-by" value={standby} hint="Fluxo pausado" icon={<ClipboardCheck size={24} />} tone="purple" />
        <Metric label="Pendência técnica" value={pendencias} hint="Requer análise operacional" icon={<Bell size={24} />} tone="green" />
        <Metric label="Valor retroativo" value={money(totalRetroativo)} hint="Soma no filtro atual" icon={<TrendingUp size={24} />} tone="green" />
        <Metric label="Total multas" value={money(totalMultas)} hint="Soma no filtro atual" icon={<DollarSign size={24} />} tone="red" />
        <Metric label="Empresas notificadas" value={empresas.length} hint="Empresas únicas" icon={<Building2 size={24} />} tone="blue" />
        <Metric label="E-mails enviados" value={emailEnviados} hint="Com data de envio" icon={<Users size={24} />} tone="purple" />
      </section>

      <section className="panel p-5">
        <form className="grid gap-4 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto] xl:items-end">
          <label className="space-y-2">
            <span className="label">Busca</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-edp-muted" size={16} />
              <input className="field pl-9" name="q" defaultValue={values.q || ""} placeholder="Empresa, censo, contrato, protocolo..." />
            </div>
          </label>
          <label className="space-y-2">
            <span className="label">Status</span>
            <select className="field" name="status" defaultValue={values.status || ""}>
              <option value="">Todos</option>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="label">Empresa</span>
            <select className="field" name="empresa" defaultValue={values.empresa || ""}>
              <option value="">Todas as empresas</option>
              {empresas.map((empresa) => <option key={empresa.empresa} value={empresa.empresa}>{empresa.empresa}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="label">Cidade</span>
            <input className="field" name="cidade" defaultValue={values.cidade || ""} placeholder="Todas" />
          </label>
          <button className="btn-primary h-[42px]">Filtrar</button>
        </form>
      </section>

      <section className="grid gap-7 xl:grid-cols-[1fr_380px]">
        <div className="panel overflow-hidden">
          <div className="border-b border-line px-6 py-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <FileText className="text-edp" size={23} />
                  <h2 className="text-2xl font-bold text-white">Notificações</h2>
                </div>
                <p className="mt-1 text-sm text-edp-muted">Últimos 100 registros do módulo Notifica Fácil.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary">
                  <RefreshCw size={16} />
                  Popular Histórico
                </button>
                <button className="btn-secondary">
                  <BarChart3 size={16} />
                  Gráfico
                </button>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <StatusChip href="/notifica-facil" active={!values.status} label="Todas" />
              {statuses.map((status) => (
                <StatusChip key={status} href={`/notifica-facil?status=${encodeURIComponent(status)}`} active={values.status === status} label={status} />
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr>
                  <th className="px-5 py-4 font-semibold">Notificação</th>
                  <th className="px-5 py-4 font-semibold">Empresa</th>
                  <th className="px-5 py-4 font-semibold">Registro censo</th>
                  <th className="px-5 py-4 font-semibold">Cidade</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Flags</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-edp-muted">Nenhuma notificação encontrada.</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-line">
                      <td className="px-5 py-4">
                        <Link href={`/notifica-facil/${item.id}`} className="font-bold text-edp hover:text-edp-hover">
                          {item.numero_notificacao || item.numero_protocolo || item.id}
                        </Link>
                        <div className="mt-1 text-xs text-edp-muted">{item.created_date ? item.created_date.toLocaleDateString("pt-BR") : "Sem data"}</div>
                      </td>
                      <td className="px-5 py-4 text-white">{item.empresa}</td>
                      <td className="px-5 py-4 text-edp-muted">{item.numero_registro_censo || "-"}</td>
                      <td className="px-5 py-4 text-edp-muted">{formatPtBrDisplay(item.empresa_cidade)}</td>
                      <td className="px-5 py-4"><StatusBadge status={item.status} /></td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {item.is_standby ? <SmallBadge label="Stand-by" /> : null}
                          {item.pendencia_tecnica || item.pt_notificado || item.pt_data_notificado ? <SmallBadge label="Pendência técnica" /> : null}
                          {item.is_draft ? <SmallBadge label="Rascunho" /> : null}
                          {!item.is_standby && !item.pendencia_tecnica && !item.pt_notificado && !item.pt_data_notificado && !item.is_draft ? <span className="text-edp-muted">-</span> : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-7">
          <section className="panel p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-edp" size={21} />
              <h3 className="font-bold text-white">Status das notificações</h3>
            </div>
            <div className="mt-6 space-y-3">
              <Progress label="Concluídas" value={concluidas} total={Math.max(total, 1)} />
              <Progress label="Stand-by" value={standby} total={Math.max(total, 1)} />
              <Progress label="Pendência técnica" value={pendencias} total={Math.max(total, 1)} />
            </div>
          </section>

          <section className="panel p-6">
            <div className="flex items-center gap-3">
              <Building2 className="text-edp" size={21} />
              <h3 className="font-bold text-white">Total por empresa</h3>
            </div>
            <div className="mt-5 space-y-3">
              {empresas.slice(0, 8).map((empresa) => (
                <div key={empresa.empresa} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
                  <span className="truncate text-sm text-edp-muted">{empresa.empresa}</span>
                  <span className="text-sm font-bold text-white">{empresa._count.empresa}</span>
                </div>
              ))}
              {empresas.length === 0 ? <p className="text-sm text-edp-muted">Sem empresas no filtro atual.</p> : null}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function Metric({ label, value, hint, icon, tone }: { label: string; value: number | string; hint: string; icon: ReactNode; tone: "green" | "yellow" | "purple" | "red" | "blue" }) {
  const tones = {
    green: "border-edp/25 bg-edp/10 text-edp",
    yellow: "border-yellow-300/25 bg-yellow-300/10 text-yellow-200",
    purple: "border-purple-300/25 bg-purple-300/10 text-purple-200",
    red: "border-red-300/25 bg-red-300/10 text-red-200",
    blue: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
  };

  return (
    <div className="panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-edp-muted">{label}</div>
          <div className="mt-3 text-3xl font-bold text-white">{value}</div>
          <div className="mt-3 text-xs font-medium text-edp-muted">{hint}</div>
        </div>
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${tones[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

function StatusChip({ href, label, active = false }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
        active ? "border-edp/45 bg-edp text-edp-navy" : "border-line bg-surface text-edp-muted hover:border-edp/35 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase();
  const tone = lower.includes("finalizar")
    ? "border-edp/35 bg-edp/15 text-edp"
    : lower.includes("resposta")
      ? "border-purple-300/30 bg-purple-300/15 text-purple-100"
      : lower.includes("email")
        ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
        : "border-yellow-300/30 bg-yellow-300/15 text-yellow-100";

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>{status}</span>;
}

function SmallBadge({ label }: { label: string }) {
  return <span className="rounded-full border border-edp/25 bg-edp/10 px-2.5 py-1 text-xs font-bold text-edp">{label}</span>;
}

function Progress({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = Math.round((value / total) * 100);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-semibold">
        <span className="text-edp-muted">{label}</span>
        <span className="text-white">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full bg-edp" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}
