import Link from "next/link";
import type { ReactNode } from "react";
import { Prisma } from "@prisma/client";
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  DollarSign,
  FileText,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Upload,
  Users
} from "lucide-react";
import { canEdit as canEditUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const statuses = [
  "Aguardando assinatura Gestor",
  "Notificação Encaminhada por E-mail.",
  "Resposta do Cliente - Anexo do E-mail.",
  "Entrega do Projeto ou Projeto Pendente. (10 dias)",
  "Não houve resposta do Cliente - Valores Informar o Faturamento.",
  "Finalizar Notificação."
];

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
    where.OR = [
      { empresa: q },
      { cnpj: q },
      { contrato_numero: q },
      { numero_notificacao: q },
      { numero_registro_censo: q },
      { numero_protocolo: q },
      { destinatario_nome: q },
      { empresa_cidade: q }
    ];
  }

  const [items, total, concluidas, empresas, emailEnviados, retroativoAgg, multaAgg] = await Promise.all([
    prisma.notificaFacilNotification.findMany({
      where,
      orderBy: [{ created_date: "desc" }, { id: "desc" }],
      take: 100
    }),
    prisma.notificaFacilNotification.count({ where }),
    prisma.notificaFacilNotification.count({ where: { ...where, status: "Finalizar Notificação." } }),
    prisma.notificaFacilNotification.groupBy({ by: ["empresa"], where }),
    prisma.notificaFacilNotification.count({ where: { ...where, data_email_encaminhado: { not: null } } }),
    prisma.notificaFacilNotification.aggregate({ where, _sum: { valor_atualizado: true } }),
    prisma.notificaFacilNotification.aggregate({ where, _sum: { multa: true } })
  ]);

  const userName = (user.full_name || user.name || user.email).split(" ")[0];
  const totalRetroativo = retroativoAgg._sum.valor_atualizado || 0;
  const totalMultas = multaAgg._sum.multa || 0;
  const naoRegularizados = Math.max(total - concluidas, 0);

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 text-[#0F172A]">
      <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Olá, {userName}! <span aria-hidden>👋</span></h1>
          <p className="mt-2 text-base text-[#64748B]">Visão geral das notificações</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 rounded-xl border border-purple-300 bg-[#FFFFFF] px-4 py-2.5 text-sm font-semibold text-purple-700 shadow-sm">
            <RefreshCw size={16} />
            Popular Histórico
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2.5 text-sm font-semibold text-[#0F172A] shadow-sm">
            <RefreshCw size={16} />
            Zerar contador (REG/0001-2025)
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2.5 text-sm font-semibold text-[#0F172A] shadow-sm">
            <FileText size={16} />
            Notificação Teste
          </button>
          {canEdit ? (
            <Link href="/notifica-facil/nova" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20">
              <Plus size={16} />
              Nova Notificação
            </Link>
          ) : null}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-3 text-sm font-medium text-[#334155]">
          Filtrar por mês:
          <select className="h-11 min-w-56 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 text-sm text-[#0F172A] shadow-sm">
            <option>Todos os meses</option>
          </select>
        </label>
        <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-blue-400 bg-[#FFFFFF] px-4 text-sm font-semibold text-blue-600">
          <BarChart3 size={16} />
          Gráfico
        </button>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Pontos Regularizados" value={concluidas} icon={<ClipboardCheck size={26} />} tone="green" />
        <Metric label="Pontos Não Regularizados" value={naoRegularizados} icon={<FileText size={26} />} tone="yellow" />
        <Metric label="Valor Total RETROATIVO" value={money(totalRetroativo)} icon={<TrendingUp size={26} />} tone="purple" />
        <Metric label="Total Multas" value={money(totalMultas)} icon={<DollarSign size={28} />} tone="red" />
        <Metric label="Multa + Retroativo" value={money(totalRetroativo + totalMultas)} icon={<DollarSign size={26} />} tone="green" />
        <Metric label="Total de Notificações" value={total} icon={<FileText size={26} />} tone="blue" />
        <Metric label="Empresas Notificadas" value={empresas.length} icon={<Building2 size={26} />} tone="gray" />
        <Metric label="E-mails Enviados" value={emailEnviados} icon={<Users size={26} />} tone="indigo" />
      </section>

      <section className="grid gap-7 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-xl shadow-slate-900/5">
            <div className="border-b border-[#E2E8F0] px-6 py-6">
              <div className="flex items-center gap-3">
                <FileText className="text-blue-600" size={24} />
                <h2 className="text-2xl font-extrabold text-[#0F172A]">Notificações</h2>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <button className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-sm font-semibold text-[#0F172A] shadow-sm">Recentes ({items.length})</button>
                <button className="rounded-xl border border-transparent px-4 py-2 text-sm font-semibold text-[#64748B]">Concluídas ({concluidas})</button>
              </div>

              <form className="mt-5 grid gap-3">
                <div className="flex flex-wrap gap-2">
                  <StatusChip href="/notifica-facil" active label="Todas" />
                  {statuses.map((status) => (
                    <StatusChip key={status} href={`/notifica-facil?status=${encodeURIComponent(status)}`} label={status} />
                  ))}
                </div>
                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                  <select className="h-11 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 text-sm text-[#0F172A]" name="empresa" defaultValue={values.empresa || ""}>
                    <option value="">Todas as empresas</option>
                    {empresas.map((empresa) => <option key={empresa.empresa} value={empresa.empresa}>{empresa.empresa}</option>)}
                  </select>
                  <select className="h-11 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 text-sm text-[#0F172A]" name="cidade" defaultValue={values.cidade || ""}>
                    <option value="">Todos os municípios</option>
                  </select>
                  <select className="h-11 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 text-sm text-[#0F172A]">
                    <option>Todos os usuários</option>
                  </select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
                    <input className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] pl-9 pr-3 text-sm text-[#0F172A]" name="q" defaultValue={values.q || ""} placeholder="Buscar nº ou empresa" />
                  </div>
                  <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 text-sm font-semibold text-[#0F172A]">
                    <Upload size={15} />
                    Exportar Excel
                  </button>
                </div>
              </form>
            </div>

            <div className="m-6 flex min-h-32 items-center justify-center rounded-2xl border border-[#CBD5E1] bg-[#FFFFFF] text-sm text-[#64748B]">
              {items.length === 0 ? "Nenhuma notificação encontrada." : `${items.length} notificação(ões) encontrada(s).`}
            </div>
          </section>
        </div>

        <aside className="space-y-7">
          <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xl shadow-slate-900/5">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-blue-600" size={20} />
              <h3 className="font-bold text-[#0F172A]">Status das Notificações</h3>
            </div>
            <div className="flex min-h-64 items-center justify-center text-sm text-[#94A3B8]">
              {total === 0 ? "Sem dados para exibir" : `${total} registros no filtro atual`}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-xl shadow-slate-900/5">
            <div className="border-b border-[#E2E8F0] px-6 py-5">
              <div className="flex items-center gap-3">
                <Building2 className="text-blue-600" size={20} />
                <h3 className="font-bold text-[#0F172A]">Total de IDs por Empresa</h3>
              </div>
            </div>
            <div className="p-6">
              <label className="text-sm font-medium text-[#334155]">Buscar empresa</label>
              <input className="mt-2 h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 text-sm text-[#0F172A]" placeholder="Digite o nome da empresa..." />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function Metric({ label, value, icon, tone }: { label: string; value: number | string; icon: ReactNode; tone: "green" | "yellow" | "purple" | "red" | "blue" | "gray" | "indigo" }) {
  const tones = {
    green: "bg-emerald-100 text-emerald-700",
    yellow: "bg-yellow-100 text-yellow-700",
    purple: "bg-purple-100 text-purple-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-[#F1F5F9] text-[#334155]",
    indigo: "bg-indigo-100 text-indigo-700"
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xl shadow-slate-900/7">
      <div>
        <div className="text-sm font-semibold text-[#64748B]">{label}</div>
        <div className="mt-3 text-3xl font-extrabold text-[#0F172A]">{value}</div>
      </div>
      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
    </div>
  );
}

function StatusChip({ href, label, active = false }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-2 text-xs font-semibold shadow-sm transition ${
        active ? "border-[#0F172A] bg-[#0F172A] text-white" : "border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A] hover:border-blue-300 hover:text-blue-600"
      }`}
    >
      {label}
    </Link>
  );
}
