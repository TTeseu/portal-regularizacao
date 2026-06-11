import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Construction, Zap } from "lucide-react";

export function NotificaFacilProcessPage({
  title,
  description,
  icon,
  action
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/notifica-facil" className="btn-secondary">
        <ArrowLeft size={16} />
        Voltar ao Dashboard
      </Link>

      <section className="panel overflow-hidden">
        <div className="relative p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(0,230,118,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_60%)]" />
          <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-edp/25 bg-edp/10 text-edp">
                {icon || <Construction size={24} />}
              </div>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-edp/25 bg-edp/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-edp">
                  <Zap size={13} />
                  Processo Notifica Fácil
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">{title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-edp-muted">{description}</p>
              </div>
            </div>
            {action}
          </div>
        </div>
      </section>

      <section className="panel p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-edp/25 bg-edp/10 text-edp">
          <Construction size={28} />
        </div>
        <h2 className="mt-5 text-xl font-bold text-white">Tela do processo preparada</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-edp-muted">
          Esta aba fica isolada dentro do módulo Notifica Fácil, seguindo o fluxo do Base44 sem misturar com o Portal de Regularização. A camada visual permanece no padrão EDP escuro.
        </p>
      </section>
    </div>
  );
}
