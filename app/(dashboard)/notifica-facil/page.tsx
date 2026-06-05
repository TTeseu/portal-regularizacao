import Link from "next/link";
import type { ReactNode } from "react";
import { Prisma } from "@prisma/client";
import { BellRing, ClipboardCheck, Download, Eye, FilePlus2, PauseCircle, Search, ShieldAlert, Zap } from "lucide-react";
import { canEdit as canEditUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";

const statuses = [
  "Aguardando assinatura Gestor",
  "Notificacao Encaminhada por E-mail.",
  "Resposta do Cliente - Anexo do E-mail.",
  "Entrega do Projeto ou Projeto Pendente. (10 dias)",
  "Nao houve resposta do Cliente - Valores Informar o Faturamento.",
  "Finalizar Notificacao."
];

function statusClass(status: string) {
  if (status.includes("Finalizar")) return "border-edp/30 bg-edp/10 text-edp";
  if (status.includes("Resposta")) return "border-sky-300/30 bg-sky-300/10 text-sky-200";
  if (status.includes("Projeto")) return "border-violet-300/30 bg-violet-300/10 text-violet-200";
  if (status.includes("Nao houve")) return "border-red-300/30 bg-red-300/10 text-red-200";
  if (status.includes("E-mail")) return "border-blue-300/30 bg-blue-300/10 text-blue-200";
  return "border-amber-300/30 bg-amber-300/10 text-amber-200";
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
  if (values.standby === "true") where.is_standby = true;
  if (values.pendencia === "true") where.pendencia_tecnica = true;
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

  const [total, aguardando, standby, pendencias, items] = await Promise.all([
    prisma.notificaFacilNotification.count({ where }),
    prisma.notificaFacilNotification.count({ where: { ...where, status: "Aguardando assinatura Gestor" } }),
    prisma.notificaFacilNotification.count({ where: { ...where, is_standby: true } }),
    prisma.notificaFacilNotification.count({ where: { ...where, pendencia_tecnica: true } }),
    prisma.notificaFacilNotification.findMany({
      where,
      orderBy: [{ created_date: "desc" }, { id: "desc" }],
      take: 100
    })
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-line bg-card p-7 shadow-2xl shadow-black/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(0,230,118,0.16),transparent_28%),linear-gradient(120deg,rgba(255,255,255,0.08),transparent_40%)]" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-edp/25 bg-edp/10 px-4 py-2 text-xs font-bold uppercase text-edp">
              <BellRing size={15} />
              Modulo documental
            </div>
            <h1 className="text-4xl font-bold text-white">Notifica Facil</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-edp-muted">
              Gestao de notificacoes vindas do censo, pendencias tecnicas, respostas de clientes, anexos, assinaturas e fluxo documental.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn-secondary" href="/home">Portal central</Link>
            {canEdit ? (
              <Link className="btn-primary" href="/notifica-facil/nova">
                <FilePlus2 size={16} />
                Nova notificacao
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Total filtrado" value={total} icon={<Zap size={24} />} />
        <Metric label="Aguardando gestor" value={aguardando} icon={<ClipboardCheck size={24} />} />
        <Metric label="Stand-by" value={standby} icon={<PauseCircle size={24} />} />
        <Metric label="Pendencia tecnica" value={pendencias} icon={<ShieldAlert size={24} />} />
      </section>

      <form className="panel grid gap-3 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <label>
          <span className="label">Busca</span>
          <div className="relative mt-1">
            <Search size={16} className="absolute left-3 top-2.5 text-edp-muted" />
            <input className="field pl-9" name="q" defaultValue={values.q || ""} placeholder="Empresa, censo, contrato, protocolo..." />
          </div>
        </label>
        <label>
          <span className="label">Status</span>
          <select className="field mt-1" name="status" defaultValue={values.status || ""}>
            <option value="">Todos</option>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Stand-by</span>
          <select className="field mt-1" name="standby" defaultValue={values.standby || ""}>
            <option value="">Todos</option>
            <option value="true">Somente stand-by</option>
          </select>
        </label>
        <label>
          <span className="label">Pendencia</span>
          <select className="field mt-1" name="pendencia" defaultValue={values.pendencia || ""}>
            <option value="">Todas</option>
            <option value="true">Com pendencia tecnica</option>
          </select>
        </label>
        <div className="flex items-end">
          <button className="btn-secondary h-10">Filtrar</button>
        </div>
      </form>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Notificacoes recentes</h2>
            <p className="mt-1 text-sm text-edp-muted">Ultimos 100 registros do modulo Notifica Facil.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3">Notificacao</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Registro censo</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Flags</th>
                <th className="px-4 py-3">Criada</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-bold text-white">{item.numero_notificacao || item.numero_protocolo || "-"}</td>
                  <td className="px-4 py-3">{item.empresa}</td>
                  <td className="px-4 py-3">{item.numero_registro_censo || "-"}</td>
                  <td className="px-4 py-3">{item.empresa_cidade || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(item.status)}`}>{item.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.is_draft ? <span className="rounded-full bg-white/10 px-2 py-1 text-xs">Draft</span> : null}
                      {item.is_standby ? <span className="rounded-full bg-amber-300/10 px-2 py-1 text-xs text-amber-200">Stand-by</span> : null}
                      {item.pendencia_tecnica ? <span className="rounded-full bg-red-300/10 px-2 py-1 text-xs text-red-200">PT</span> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatDateTime(item.created_date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <a className="btn-secondary px-3" href={`/api/notifica-facil/notifications/${item.id}/pdf`} title="Baixar PDF">
                        <Download size={15} />
                      </a>
                      <Link className="btn-secondary px-3" href={`/notifica-facil/${item.id}`} title="Abrir">
                        <Eye size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-edp-muted" colSpan={8}>Nenhuma notificacao encontrada.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-card to-surface p-5 shadow-xl shadow-black/10">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-edp/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-edp-muted">{label}</div>
          <div className="mt-3 text-3xl font-bold text-white">{value}</div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-edp/25 bg-edp/10 text-edp">{icon}</div>
      </div>
    </div>
  );
}
