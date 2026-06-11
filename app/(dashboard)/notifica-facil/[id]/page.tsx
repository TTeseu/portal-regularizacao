import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileText, ImageIcon, Trash2 } from "lucide-react";
import { canEdit, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildNotificaFacilHtml, sanitizeNotificaFacilHtml } from "@/lib/notifica-facil-html";
import { NotificaFacilForm } from "@/components/notifica-facil-form";
import { formatDateTime, formatPtBrDisplay } from "@/lib/format";
import { deleteNotificaFacilNotification, updateNotificaFacilNotification } from "../actions";

export default async function NotificaFacilDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const [{ id }, user, query] = await Promise.all([params, requireUser(), searchParams]);
  const [notification, logs, templateHtml] = await Promise.all([
    prisma.notificaFacilNotification.findUnique({ where: { id } }),
    prisma.notificaFacilActivityLog.findMany({
      where: { notification_id: id },
      orderBy: { timestamp: "desc" },
      take: 20
    }),
    readFile(join(process.cwd(), "public", "templates", "notifica-facil-template.html"), "utf8").catch(() => "")
  ]);

  if (!notification) notFound();
  const mayEdit = canEdit(user);
  const html = sanitizeNotificaFacilHtml(notification.html_content || buildNotificaFacilHtml(notification));
  const backHref = getSafeBackHref(query?.from, notification);
  const evidences = collectEvidences(notification.fotos_censo, notification.ocr_legendas);
  const attachments = collectAttachments(notification.notificacao_assinada_anexos, notification.anexos_resposta_email);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <Link className="btn-secondary mb-4" href={backHref}>
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
        <Info label="Último download" value={formatDateTime(notification.last_downloaded_at)} />
        <Info label="PDF salvo" value={notification.pdf_url || notification.pdf_base64 ? "Sim" : "Não"} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line bg-surface px-5 py-4">
            <FileText className="text-edp" size={18} />
            <h2 className="font-bold text-white">Prévia do documento</h2>
          </div>
          <iframe className="h-[720px] w-full bg-white" sandbox="" srcDoc={html} title="Prévia Notifica Fácil" />
        </div>

        <aside className="space-y-4">
          <div className="panel p-5">
            <h2 className="mb-3 font-bold text-white">Resumo operacional</h2>
            <dl className="space-y-3 text-sm">
              <Row label="Protocolo" value={notification.numero_protocolo} />
              <Row label="Contrato" value={notification.contrato_numero} />
              <Row label="CNPJ" value={notification.cnpj} />
              <Row label="Cidade" value={formatPtBrDisplay(notification.empresa_cidade)} />
              <Row label="Ordem venda" value={notification.ordem_venda} />
              <Row label="Pendência técnica" value={notification.pendencia_tecnica ? "Sim" : "Não"} />
              <Row label="Poste" value={notification.numero_poste} />
            </dl>
          </div>

          <EvidencePanel evidences={evidences} attachments={attachments} />

          <div className="panel p-5">
            <h2 className="mb-3 font-bold text-white">Histórico</h2>
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
        templateHtml={templateHtml}
      />
    </div>
  );
}

function getSafeBackHref(value: string | undefined, notification: { pendencia_tecnica: boolean; pt_notificado: boolean; pt_data_notificado?: string | null }) {
  const allowed = new Set([
    "/notifica-facil",
    "/notifica-facil/pendencia-tecnica",
    "/notifica-facil/notificacao-pendencias",
    "/notifica-facil/historico-pendencia-tecnica",
    "/notifica-facil/stand-by",
    "/notifica-facil/pdfs"
  ]);
  if (value && allowed.has(value)) return value;
  if (notification.pendencia_tecnica || notification.pt_notificado || notification.pt_data_notificado) {
    return "/notifica-facil/pendencia-tecnica";
  }
  return "/notifica-facil";
}

function collectEvidences(fotos: unknown, ocr: unknown) {
  const urls = Array.isArray(fotos) ? fotos.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  const ocrRows = Array.isArray(ocr) ? ocr : [];
  return urls.map((url, index) => {
    const match = ocrRows.find((item) => item && typeof item === "object" && (item as Record<string, unknown>).url === url) as Record<string, unknown> | undefined;
    return {
      url,
      name: fileNameFromUrl(url) || `Foto ${index + 1}`,
      text: typeof match?.texto === "string" ? match.texto : "",
      date: typeof match?.data_ocr === "string" ? match.data_ocr : ""
    };
  });
}

function collectAttachments(...groups: unknown[]) {
  return groups.flatMap((group) => {
    if (!Array.isArray(group)) return [];
    return group
      .map((item, index) => {
        if (typeof item === "string") return { url: item, name: fileNameFromUrl(item) || `Anexo ${index + 1}` };
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const url = String(row.url || row.file_url || row.href || "");
        if (!url) return null;
        return { url, name: String(row.nome || row.name || fileNameFromUrl(url) || `Anexo ${index + 1}`) };
      })
      .filter((item): item is { url: string; name: string } => Boolean(item));
  });
}

function fileNameFromUrl(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() || "");
  } catch {
    return url.split("/").filter(Boolean).pop() || "";
  }
}

function EvidencePanel({
  evidences,
  attachments
}: {
  evidences: Array<{ url: string; name: string; text: string; date: string }>;
  attachments: Array<{ url: string; name: string }>;
}) {
  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <ImageIcon className="text-edp" size={18} />
        <h2 className="font-bold text-white">Fotos e Evidencias</h2>
      </div>
      {evidences.length ? (
        <div className="grid gap-3">
          {evidences.map((item, index) => (
            <article key={`${item.url}-${index}`} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <a href={item.url} target="_blank" rel="noreferrer" className="block">
                <img src={item.url} alt={item.name} className="h-44 w-full object-cover" />
              </a>
              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-white">{item.name}</div>
                    {item.date ? <div className="text-xs text-edp-muted">{formatDateTime(new Date(item.date))}</div> : null}
                  </div>
                  <a className="btn-secondary h-8 px-2 text-xs" href={item.url} target="_blank" rel="noreferrer">
                    <ExternalLink size={13} />
                  </a>
                </div>
                {item.text ? <p className="line-clamp-4 whitespace-pre-line text-xs leading-5 text-edp-muted">{item.text}</p> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-edp-muted">Nenhuma foto vinculada a esta notificação.</p>
      )}

      {attachments.length ? (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="mb-3 text-sm font-bold text-white">Anexos</h3>
          <div className="space-y-2">
            {attachments.map((item) => (
              <a key={item.url} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-3 py-2 text-sm text-edp-muted hover:border-edp/40 hover:text-edp" href={item.url} target="_blank" rel="noreferrer">
                <span className="truncate">{item.name}</span>
                <Download size={14} />
              </a>
            ))}
          </div>
        </div>
      ) : null}
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
