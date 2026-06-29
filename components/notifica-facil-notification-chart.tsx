import { CheckCircle2, FilePieChart, FileText, Send } from "lucide-react";

type ChartProps = {
  title: string;
  description?: string;
  generated: number;
  sent: number;
  responded: number;
};

const rows = [
  {
    key: "generated",
    label: "Notificações geradas",
    icon: FileText,
    color: "#67e8f9",
    tone: "text-cyan-100",
    ring: "bg-cyan-300"
  },
  {
    key: "sent",
    label: "Notificações enviadas",
    icon: Send,
    color: "#00e676",
    tone: "text-edp",
    ring: "bg-edp"
  },
  {
    key: "responded",
    label: "Com resposta do cliente",
    icon: CheckCircle2,
    color: "#d8b4fe",
    tone: "text-purple-100",
    ring: "bg-purple-300"
  }
] as const;

export function NotificaFacilNotificationChart({ title, description, generated, sent, responded }: ChartProps) {
  const values = { generated, sent, responded };
  const chartRows = rows.map((row) => ({ ...row, value: values[row.key] }));
  const total = chartRows.reduce((sum, row) => sum + row.value, 0);
  let cursor = 0;
  const segments = chartRows.map((row) => {
    const start = total > 0 ? (cursor / total) * 360 : 0;
    cursor += row.value;
    const end = total > 0 ? (cursor / total) * 360 : 0;
    return `${row.color} ${start}deg ${end}deg`;
  });
  const background = total > 0 ? `conic-gradient(${segments.join(", ")})` : "conic-gradient(rgba(255,255,255,0.12) 0deg 360deg)";

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-edp/25 bg-edp/10 text-edp">
            <FilePieChart size={21} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {description ? <p className="mt-1 text-sm text-edp-muted">{description}</p> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-7 p-6 lg:grid-cols-[360px_1fr] lg:items-center">
        <div className="flex justify-center">
          <div
            className="relative flex aspect-square w-full max-w-[280px] items-center justify-center rounded-full p-5 shadow-[0_22px_70px_rgba(0,230,118,0.16)]"
            style={{ background }}
            aria-label={`${title}: ${total} indicadores contabilizados`}
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-line bg-edp-navy/95 text-center shadow-inner">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-edp-muted">Total</span>
              <span className="mt-2 text-4xl font-bold text-white">{total}</span>
              <span className="mt-1 text-xs font-medium text-edp-muted">indicadores</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
          {chartRows.map((row) => {
            const Icon = row.icon;
            const percent = total > 0 ? Math.round((row.value / total) * 100) : 0;
            return (
              <div key={row.key} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${row.ring}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-edp-muted">
                        <Icon size={15} className={row.tone} />
                        <span className="truncate">{row.label}</span>
                      </div>
                      <div className="mt-2 text-2xl font-bold text-white">{row.value}</div>
                    </div>
                  </div>
                  <div className="rounded-full border border-line bg-white/5 px-3 py-1 text-sm font-bold text-edp">
                    {percent}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
