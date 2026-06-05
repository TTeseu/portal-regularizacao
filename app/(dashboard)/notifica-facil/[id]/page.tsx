import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, Trash2 } from "lucide-react";
import { canEdit, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildNotificaFacilHtml } from "@/lib/notifica-facil-html";
import { NotificaFacilForm } from "@/components/notifica-facil-form";
import { formatDateTime } from "@/lib/format";
import { deleteNotificaFacilNotification, updateNotificaFacilNotification } from "../actions";

export default async function NotificaFacilDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const [notification, logs] = await Promise.all([
    prisma.notificaFacilNotification.findUnique({ where: { id } }),
    prisma.notificaFacilActivityLog.findMany({
      where: { notification_id: id },
      orderBy: { timestamp: "desc" },
      take: 20
    })
  ]);

  if (!notification) notFound();
  const mayEdit = canEdit(user);
  const html = notification.html_content || buildNotificaFacilHtml(notification);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <Link className="btn-secondary mb-4" href="/notifica-facil">
            <ArrowLeft size={16} />
            Voltar
          </Link>
          <h1 className="text-3xl font-bold text-white">{notification.numero_notificacao || notification.empresa}</h1>
          <p className="mt-2 text-sm text-edp-muted">
            {notification.empresa} · Registro censo {notification.numero_registro_censo || "-"} · {notification.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn-primary" href={`/api/notifica-facil/notifications/${notification.id}/pdf`}>
            <Download size={16} />
            Baixar PDF
          </a>
          {mayEdit ? (
            <form action={deleteNotificaFacilNotification.bind(null, notification.id)}>
              <button className="btn-danger" type="submit">
                <Trash2 size={16} />
                Excluir
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Info label="Status" value={notification.status} />
        <Info label="Downloads" value={String(notification.download_count)} />
        <Info label="Ultimo download" value={formatDateTime(notification.last_downloaded_at)} />
        <Info label="PDF salvo" value={notification.pdf_url || notification.pdf_base64 ? "Sim" : "Nao"} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line bg-surface px-5 py-4">
            <FileText className="text-edp" size={18} />
            <h2 className="font-bold text-white">Previa do documento</h2>
          </div>
          <iframe className="h-[720px] w-full bg-white" sandbox="" srcDoc={html} title="Previa Notifica Facil" />
        </div>

        <aside className="space-y-4">
          <div className="panel p-5">
            <h2 className="mb-3 font-bold text-white">Resumo operacional</h2>
            <dl className="space-y-3 text-sm">
              <Row label="Protocolo" value={notification.numero_protocolo} />
              <Row label="Contrato" value={notification.contrato_numero} />
              <Row label="CNPJ" value={notification.cnpj} />
              <Row label="Cidade" value={notification.empresa_cidade} />
              <Row label="Ordem venda" value={notification.ordem_venda} />
              <Row label="Pendencia tecnica" value={notification.pendencia_tecnica ? "Sim" : "Nao"} />
            </dl>
          </div>

          <div className="panel p-5">
            <h2 className="mb-3 font-bold text-white">Historico</h2>
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-xl border border-line bg-surface p-3 text-sm">
                  <div className="font-bold text-white">{log.action}</div>
                  <div className="mt-1 text-xs text-edp-muted">{formatDateTime(log.timestamp)} · {log.user_name || log.user_email}</div>
                  {log.details ? <div className="mt-2 text-edp-muted">{log.details}</div> : null}
                </div>
              ))}
              {logs.length === 0 ? <p className="text-sm text-edp-muted">Nenhum log registrado.</p> : null}
            </div>
          </div>
        </aside>
      </section>

      <NotificaFacilForm
        notification={notification}
        action={updateNotificaFacilNotification.bind(null, notification.id)}
        canEdit={mayEdit}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <div className="text-xs font-bold uppercase text-edp-muted">{label}</div>
      <div className="mt-2 text-lg font-bold text-white">{value || "-"}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line pb-2">
      <dt className="text-edp-muted">{label}</dt>
      <dd className="text-right font-semibold text-white">{value || "-"}</dd>
    </div>
  );
}
