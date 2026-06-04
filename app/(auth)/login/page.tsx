import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
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
    <main className="grid min-h-screen place-items-center bg-surface px-4">
      <form action="/api/auth/login" method="post" className="panel w-full max-w-sm p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-edp text-white">
            <FileText size={21} />
          </div>
          <div>
            <h1 className="text-lg font-bold">Portal de Regularização</h1>
            <p className="text-sm text-slate-500">Acesse sua conta</p>
          </div>
        </div>
        {params?.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Email ou senha inválidos.
          </div>
        ) : null}
        <div className="space-y-4">
          <label className="block">
            <span className="label">Email</span>
            <input className="field mt-1" name="email" type="email" required />
          </label>
          <label className="block">
            <span className="label">Senha</span>
            <input className="field mt-1" name="password" type="password" required />
          </label>
          <button className="btn-primary w-full" type="submit">
            Entrar
          </button>
        </div>
      </form>
    </main>
  );
}
