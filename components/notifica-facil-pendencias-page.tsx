import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowLeft, Bell, CheckCircle2, Clock3, Download, FileText, Plus, Search } from "lucide-react";
import { Prisma } from "@prisma/client";
import { canEdit as canEditUser, requireUser } from "@/lib/auth";
import { formatDate, formatDateTime, formatPtBrDisplay } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { markNotificaFacilPtNotificado } from "@/app/(dashboard)/notifica-facil/actions";

type Mode = "ativas" | "historico" | "notificar";

const pendenciaWhere: Prisma.NotificaFacilNotificationWhereInput = {
  OR: [
    { pendencia_tecnica: true },
    { pt_notificado: true },
    { pt_data_notificado: { not: null } }
  ]
};

function mergeWhere(base: Prisma.NotificaFacilNotificationWhereInput, extra: Prisma.NotificaFacilNotificationWhereInput) {
  return { AND: [base, extra] } satisfies Prisma.NotificaFacilNotificationWhereInput;
}

function currentWhere(mode: Mode, query: string) {
  const filters: Prisma.NotificaFacilNotificationWhereInput[] = [pendenciaWhere];
  if (mode === "historico") {
    filters.push({ OR: [{ pt_notificado: true }, { pt_data_notificado: { not: null } }] });
  }
  if (mode === "notificar") {
    filters.push({ pt_notificado: false });
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
        { observacoes: q }
      ]
    });
  }
  return filters.length === 1 ? filters[0] : { AND: filters };
}

export async function NotificaFacilPendenciasPage({
  title,
  description,
  mode,
  icon,
  searchParams
}: {
  title: string;
  description: string;
  mode: Mode;
  icon?: ReactNode;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const [params, user] = await Promise.all([searchParams, requireUser()]);
  const q = (params?.q || "").trim();
  const canEdit = canEditUser(user);
  const where = currentWhere(mode, q);

  const [items, total, aguardando, notificados, comData, logs] = await Promise.all([
    prisma.notificaFacilNotification.findMany({
      where,
      orderBy: [{ updated_date: "desc" }, { created_date: "desc" }],
      take: 150
    }),
    prisma.notificaFacilNotification.count({ where: pendenciaWhere }),
    prisma.notificaFacilNotification.count({ where: mergeWhere(pendenciaWhere, { pt_notificado: false }) }),
    prisma.notificaFacilNotification.count({ where: mergeWhere(pendenciaWhere, { pt_notificado: true }) }),
    prisma.notificaFacilNotification.count({ where: mergeWhere(pendenciaWhere, { pt_data_notificado: { not: null } }) }),
    mode === "historico"
      ? prisma.notificaFacilActivityLog.findMany({
          where: {
            OR: [
              { action: { contains: "pendencia", mode: "insensitive" } },
              { details: { contains: "pendencia", mode: "insensitive" } },
              { field_changed: { contains: "pendencia", mode: "insensitive" } }
            ]
          },
          orderBy: { timestamp: "desc" },
          take: 40
        })
      : Promise.resolve([])
  ]);

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
              <ProcessLink href="/notifica-facil/pendencia-tecnica" active={mode === "ativas"} label="Pendências" />
              <ProcessLink href="/notifica-facil/notificacao-pendencias" active={mode === "notificar"} label="Notificar" />
              <ProcessLink href="/notifica-facil/historico-pendencia-tecnica" active={mode === "historico"} label="Histórico" />
              {mode === "notificar" && canEdit ? (
                <Link className="btn-primary" href="/notifica-facil/notificacao-pendencias/nova">
                  <Plus size={16} />
                  Criar notificação
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Pendências técnicas" value={total} icon={<AlertTriangle size={22} />} />
        <Metric label="Aguardando PT" value={aguardando} icon={<Clock3 size={22} />} />
        <Metric label="PT notificado" value={notificados} icon={<CheckCircle2 size={22} />} />
        <Metric label="Com data PT" value={comData} icon={<FileText size={22} />} />
      </section>

      <section className="panel p-5">
        <form className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1 space-y-2">
            <span className="label">Buscar no processo</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-edp-muted" size={16} />
              <input className="field pl-9" name="q" defaultValue={q} placeholder="Empresa, notificação, censo, protocolo, cidade..." />
            </div>
          </label>
          <button className="btn-primary h-[42px]">Filtrar</button>
          {q ? <Link className="btn-secondary h-[42px]" href={modeHref(mode)}>Limpar</Link> : null}
        </form>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-6 py-5">
          <h2 className="text-xl font-bold text-white">{mode === "historico" ? "Histórico das pendências" : "Notificações com pendência técnica"}</h2>
          <p className="mt-1 text-sm text-edp-muted">
            {mode === "notificar" ? "Registros pendentes de marcação PT notificado." : "Registros normalizados da base Base44 do Notifica Fácil."}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead>
              <tr>
                <th className="px-5 py-4 font-semibold">Notificação</th>
                <th className="px-5 py-4 font-semibold">Empresa</th>
                <th className="px-5 py-4 font-semibold">Registro censo</th>
                <th className="px-5 py-4 font-semibold">Cidade</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">PT</th>
                <th className="px-5 py-4 font-semibold">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? items.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-5 py-4">
                    <Link href={`/notifica-facil/${item.id}?from=${encodeURIComponent(modeHref(mode))}`} className="font-bold text-edp hover:text-edp-hover">
                      {item.numero_notificacao || item.numero_protocolo || item.id}
                    </Link>
                    <div className="mt-1 text-xs text-edp-muted">{formatDate(item.updated_date)}</div>
                  </td>
                  <td className="px-5 py-4 text-white">{item.empresa}</td>
                  <td className="px-5 py-4 text-edp-muted">{item.numero_registro_censo || "-"}</td>
                  <td className="px-5 py-4 text-edp-muted">{formatPtBrDisplay(item.empresa_cidade)}</td>
                  <td className="px-5 py-4"><StatusBadge value={item.status} /></td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <SmallBadge tone={item.pt_notificado ? "green" : "yellow"} label={item.pt_notificado ? "Notificado" : "Aguardando"} />
                      <div className="text-xs text-edp-muted">{item.pt_data_notificado || "Sem data PT"}</div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/notifica-facil/${item.id}?from=${encodeURIComponent(modeHref(mode))}`} className="btn-secondary h-9 px-3 text-xs">Abrir</Link>
                      <a href={`/api/notifica-facil/notifications/${item.id}/pdf`} className="btn-secondary h-9 px-3 text-xs">
                        <Download size={14} />
                        PDF
                      </a>
                      {canEdit && !item.pt_notificado ? (
                        <form action={markNotificaFacilPtNotificado.bind(null, item.id)}>
                          <button className="btn-primary h-9 px-3 text-xs" type="submit">Marcar PT</button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-edp-muted">Nenhuma pendência técnica encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
            {logs.length === 0 ? <p className="text-sm text-edp-muted">Nenhum log de pendência registrado.</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function modeHref(mode: Mode) {
  if (mode === "historico") return "/notifica-facil/historico-pendencia-tecnica";
  if (mode === "notificar") return "/notifica-facil/notificacao-pendencias";
  return "/notifica-facil/pendencia-tecnica";
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
