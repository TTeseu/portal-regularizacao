const colors: Record<string, string> = {
  Pendente: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  Notificado: "border-sky-300/30 bg-sky-300/10 text-sky-200",
  "Em Analise": "border-violet-300/30 bg-violet-300/10 text-violet-200",
  "Em Análise": "border-violet-300/30 bg-violet-300/10 text-violet-200",
  Regularizado: "border-edp/30 bg-edp/10 text-edp",
  Vencido: "border-red-300/30 bg-red-400/10 text-red-200"
};

export function StatusBadge({ status }: { status?: string | null }) {
  const label = status || "Pendente";
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${colors[label] || "border-white/10 bg-white/5 text-edp-muted"}`}>
      {label}
    </span>
  );
}
