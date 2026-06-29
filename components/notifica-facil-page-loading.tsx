import { Loader2 } from "lucide-react";

export function NotificaFacilPageLoading({ label = "Carregando módulo..." }: { label?: string }) {
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="panel overflow-hidden">
        <div className="relative p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(0,230,118,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_60%)]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-edp/25 bg-edp/10 text-edp">
              <Loader2 className="animate-spin" size={25} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-edp">Notifica Fácil</div>
              <h1 className="mt-2 text-3xl font-bold text-white">{label}</h1>
              <p className="mt-1 text-sm text-edp-muted">Atualizando os dados do processo.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="panel h-28 animate-pulse bg-white/5" />
        ))}
      </section>

      <section className="panel space-y-4 p-6">
        <div className="h-5 w-52 animate-pulse rounded-full bg-white/10" />
        <div className="h-11 animate-pulse rounded-xl bg-white/10" />
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
      </section>
    </div>
  );
}
