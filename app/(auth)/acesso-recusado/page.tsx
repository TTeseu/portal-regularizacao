import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function AcessoRecusadoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "approved" && user.accessApproved) redirect("/");
  if (user.status !== "rejected") redirect("/aguardando-aprovacao");

  return (
    <main className="grid min-h-screen place-items-center bg-edp-navy edp-technical-bg px-4 py-10">
      <section className="panel w-full max-w-xl p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-300/30 bg-red-500/10 text-red-200">
          <ShieldAlert size={30} />
        </div>
        <img src="/edp-logo-white.svg" alt="EDP" className="mx-auto mb-6 h-12 w-auto" />
        <h1 className="text-3xl font-bold text-white">Acesso não aprovado</h1>
        <p className="mt-4 text-edp-muted">
          Sua solicitação de acesso não foi aprovada. Entre em contato com um administrador do Portal de Regularização.
        </p>
        <div className="mt-6 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-edp-muted">
          Conta solicitante: <span className="font-semibold text-white">{user.email}</span>
        </div>
        <form action="/api/auth/logout" method="post" className="mt-8">
          <button className="btn-secondary" type="submit">Sair</button>
        </form>
      </section>
    </main>
  );
}
