import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-edp-navy px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center">
          <div
            className="flex h-20 w-40 items-center justify-center rounded-2xl border border-white/10 bg-white/5 bg-contain bg-center bg-no-repeat px-6"
            style={{ backgroundImage: "url('https://www.edp.com.br/css/icons/EDP-Logo-white.svg')" }}
            aria-label="EDP"
          >
            <span className="text-3xl font-bold tracking-wide text-white">EDP</span>
          </div>
        </div>
        <form action="/api/auth/login" method="post" className="panel p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-edp/30 bg-edp/10 text-edp">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white">Portal de Regularização</h1>
            <p className="mt-2 text-sm text-edp-muted">Acesse a plataforma interna de notificações</p>
          </div>
          {params?.error ? (
            <div className="mb-5 rounded-xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              Email ou senha inválidos.
            </div>
          ) : null}
          <div className="space-y-5">
            <label className="block">
              <span className="label">Email</span>
              <input className="field mt-2" name="email" type="email" required />
            </label>
            <label className="block">
              <span className="label">Senha</span>
              <input className="field mt-2" name="password" type="password" required />
            </label>
            <button className="btn-primary w-full" type="submit">
              Entrar
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
