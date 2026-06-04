const colors: Record<string, string> = {
  Pendente: "border-amber-200 bg-amber-50 text-amber-800",
  Notificado: "border-blue-200 bg-blue-50 text-blue-800",
  "Em Análise": "border-violet-200 bg-violet-50 text-violet-800",
  Regularizado: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Vencido: "border-red-200 bg-red-50 text-red-800"
};

export function StatusBadge({ status }: { status?: string | null }) {
  const label = status || "Pendente";
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${colors[label] || "border-slate-200 bg-slate-50 text-slate-700"}`}>
      {label}
    </span>
  );
}
