import { redirect } from "next/navigation";
import { Mail, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isGoogleAuthConfigured } from "@/lib/auth-env";
import { signInWithGoogle } from "./actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user?.status === "rejected") redirect("/acesso-recusado");
  if (user && (user.status !== "approved" || !user.accessApproved)) redirect("/aguardando-aprovacao");
  if (user) redirect("/");
  const params = await searchParams;
  const googleConfigured = isGoogleAuthConfigured();

  return (
    <main className="grid min-h-screen place-items-center bg-edp-navy px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center">
          <div className="flex h-20 w-40 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6">
            <img src="/edp-logo-white.svg" alt="EDP" className="h-12 w-auto" />
          </div>
        </div>
        <div className="panel p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-edp/30 bg-edp/10 text-edp">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white">Portal de Regularização</h1>
            <p className="mt-2 text-sm text-edp-muted">Acesse a plataforma interna de notificações</p>
          </div>
          {params?.error ? (
            <div className="mb-5 rounded-xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {params.error === "google_not_configured"
                ? "Login Google ainda não está configurado no ambiente de produção."
                : "Não foi possível entrar. Verifique a conta utilizada."}
            </div>
          ) : null}

          <form action={signInWithGoogle}>
            <button className="btn-primary w-full" type="submit" disabled={!googleConfigured}>
              <Mail size={18} />
              Entrar com Google
            </button>
          </form>
          {!googleConfigured ? (
            <p className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-xs text-amber-100">
              Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET na Vercel para habilitar o login Google.
            </p>
          ) : null}

          <div className="my-6 flex items-center gap-3 text-xs uppercase text-edp-muted">
            <span className="h-px flex-1 bg-white/10" />
            acesso legado
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form action="/api/auth/login" method="post" className="space-y-5">
            <label className="block">
              <span className="label">Email</span>
              <input className="field mt-2" name="email" type="email" required />
            </label>
            <label className="block">
              <span className="label">Senha</span>
              <input className="field mt-2" name="password" type="password" required />
            </label>
            <button className="btn-secondary w-full" type="submit">
              Entrar com senha
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
