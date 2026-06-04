import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, Download, Eye, FileText, Send } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildNotificacaoHtml } from "@/lib/notificacao-html";
import { canEdit, requireUser } from "@/lib/auth";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { NotificacaoForm } from "@/components/notificacao-form";
import { formatDateTime } from "@/lib/format";
import { markNotificacao, updateNotificacao } from "../../actions";

export default async function NotificacaoDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const notificacao = await prisma.notificacao.findUnique({ where: { id } });
  if (!notificacao) notFound();
  const html = buildNotificacaoHtml(notificacao);
  const mayEdit = canEdit(user);
  const flagActions = [
    { field: "visualizada", enabled: notificacao.visualizada, icon: Eye, label: "Visualizada" },
    { field: "arquivada", enabled: notificacao.arquivada, icon: Archive, label: "Arquivada" },
    { field: "sem_projeto", enabled: notificacao.sem_projeto, icon: FileText, label: "Sem projeto" },
    { field: "encaminhado_prefeitura", enabled: notificacao.encaminhado_prefeitura, icon: Send, label: "Prefeitura" }
  ] as const;

  return (
    <>
      <PageTitle
        title={notificacao.numero_oficio || "Notificação"}
        subtitle={`${notificacao.empresa || "Sem empresa"} · ${notificacao.cidade || "Sem cidade"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <a className="btn-secondary" href={`/api/notificacoes/${id}/download`}>
              <Download size={16} />
              HTML
            </a>
            <a className="btn-primary" href={`/api/notificacoes/${id}/pdf`}>
              <FileText size={16} />
              PDF
            </a>
          </div>
        }
      />

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="panel p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Status</div>
          <div className="mt-3"><StatusBadge status={notificacao.status} /></div>
        </div>
        <div className="panel p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Origem</div>
          <div className="mt-3 text-sm font-semibold">{notificacao.origem}</div>
        </div>
        <div className="panel p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Downloads</div>
          <div className="mt-3 text-2xl font-bold">{notificacao.download_count}</div>
        </div>
        <div className="panel p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Último download</div>
          <div className="mt-3 text-sm">{formatDateTime(notificacao.last_downloaded_at)}</div>
        </div>
        <div className="panel p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Lote</div>
          <div className="mt-3 text-sm font-semibold">{notificacao.lote_nome || notificacao.lote_id || "-"}</div>
        </div>
      </section>

      <section className="mb-6 flex flex-wrap gap-2">
        {flagActions.map(({ field, enabled, icon: Icon, label }) => (
          <form key={field} action={markNotificacao.bind(null, id, field, !enabled)}>
            <button disabled={!mayEdit} className={enabled ? "btn-danger" : "btn-secondary"} type="submit">
              <Icon size={16} />
              {label}
            </button>
          </form>
        ))}
        {notificacao.lote_id ? (
          <a className="btn-secondary" href={`/api/downloads/lote?lote_id=${encodeURIComponent(notificacao.lote_id)}`}>
            <Download size={16} />
            Lote
          </a>
        ) : null}
        <Link className="btn-secondary" href="/notificacoes">Voltar</Link>
      </section>

      <section className="mb-6 grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="panel overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-bold">Preview do documento</h2>
          </div>
          <iframe
            className="h-[720px] w-full bg-white"
            sandbox=""
            srcDoc={html}
            title="Preview da notificação"
          />
        </div>
        <div className="space-y-4">
          <div className="panel p-4">
            <h2 className="mb-3 text-sm font-bold">Observações</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{notificacao.observacoes || "-"}</p>
          </div>
          <div className="panel p-4">
            <h2 className="mb-3 text-sm font-bold">Retorno do cliente</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{notificacao.retorno_cliente || "-"}</p>
          </div>
          <div className="panel p-4">
            <h2 className="mb-3 text-sm font-bold">Anexos</h2>
            {notificacao.anexo_url ? (
              <a className="text-sm font-semibold text-edp underline" href={notificacao.anexo_url} target="_blank">
                {notificacao.anexo_nome || notificacao.anexo_url}
              </a>
            ) : (
              <p className="text-sm text-slate-500">Nenhum anexo cadastrado.</p>
            )}
          </div>
        </div>
      </section>

      <PageTitle title="Editar dados" />
      <NotificacaoForm
        notificacao={notificacao}
        action={updateNotificacao.bind(null, id)}
        canEdit={mayEdit}
      />
    </>
  );
}
