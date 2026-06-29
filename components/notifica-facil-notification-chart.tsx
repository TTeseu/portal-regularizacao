import { BarChart3, CheckCircle2, FileText, Send } from "lucide-react";

type ChartProps = {
  title: string;
  description?: string;
  generated: number;
  sent: number;
  responded: number;
};

const rows = [
  { key: "generated", label: "Notificações geradas", icon: FileText, color: "bg-cyan-300", text: "text-cyan-100" },
  { key: "sent", label: "Notificações enviadas", icon: Send, color: "bg-edp", text: "text-edp" },
  { key: "responded", label: "Com resposta do cliente", icon: CheckCircle2, color: "bg-purple-300", text: "text-purple-100" }
] as const;

export function NotificaFacilNotificationChart({ title, description, generated, sent, responded }: ChartProps) {
  const values = { generated, sent, responded };
  const max = Math.max(generated, sent, responded, 1);

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-edp/25 bg-edp/10 text-edp">
            <BarChart3 size={21} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {description ? <p className="mt-1 text-sm text-edp-muted">{description}</p> : null}
          </div>
        </div>
      </div>
      <div className="grid gap-5 p-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          {rows.map((row) => {
            const Icon = row.icon;
            const value = values[row.key];
            const percent = Math.max(4, Math.round((value / max) * 100));
            return (
              <div key={row.key}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-edp-muted">
                    <Icon size={16} className={row.text} />
                    {row.label}
                  </div>
                  <div className="text-lg font-bold text-white">{value}</div>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-3 rounded-full ${row.color}`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.key} className="rounded-2xl border border-line bg-surface p-4">
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 ${row.text}`}>
                  <Icon size={18} />
                </div>
                <div className="text-xs font-bold uppercase tracking-wide text-edp-muted">{row.label}</div>
                <div className="mt-2 text-2xl font-bold text-white">{values[row.key]}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
