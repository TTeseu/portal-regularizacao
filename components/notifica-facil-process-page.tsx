import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Construction } from "lucide-react";

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
    <div className="mx-auto max-w-6xl space-y-6 text-[#0F172A]">
      <Link href="/notifica-facil" className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2.5 text-sm font-semibold text-[#334155] shadow-sm transition hover:border-blue-300 hover:text-blue-600">
        <ArrowLeft size={16} />
        Voltar ao Dashboard
      </Link>

      <section className="rounded-3xl border border-[#E2E8F0] bg-[#FFFFFF] p-8 shadow-xl shadow-slate-900/5">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              {icon || <Construction size={24} />}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A]">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64748B]">{description}</p>
            </div>
          </div>
          {action}
        </div>
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-8 text-center shadow-xl shadow-slate-900/5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Construction size={28} />
        </div>
        <h2 className="mt-5 text-xl font-bold text-[#0F172A]">Tela do processo preparada</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64748B]">
          Esta aba foi separada dentro do fluxo do Notifica Fácil para seguir a navegação do Base44. A implementação operacional específica pode ser evoluída aqui sem misturar com o Portal de Regularização.
        </p>
      </section>
    </div>
  );
}
