"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Database, HardDrive } from "lucide-react";

type UsageItem = {
  key: "supabase-db" | "r2-storage";
  label: string;
  usedBytes: number | null;
  limitBytes: number;
  percent: number | null;
  level: "ok" | "warning" | "critical" | "unknown";
  message: string;
};

type UsageResponse = {
  checkedAt: string;
  warningPercent: number;
  criticalPercent: number;
  r2Objects: number | null;
  hasWarning: boolean;
  items: UsageItem[];
};

function formatBytes(value: number | null) {
  if (value === null) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = value;
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }
  return `${amount.toLocaleString("pt-BR", { maximumFractionDigits: unitIndex === 0 ? 0 : 1 })} ${units[unitIndex]}`;
}

function iconFor(key: UsageItem["key"]) {
  return key === "supabase-db" ? Database : HardDrive;
}

export function UsageLimitAlert({ enabled }: { enabled: boolean }) {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/usage/limits", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as UsageResponse;
        if (!active) return;
        setUsage(data);
        setOpen(data.hasWarning);
      } catch {
        // O alerta de limite nunca deve quebrar a navegação do sistema.
      }
    }

    load();
    const interval = window.setInterval(load, 1000 * 60 * 5);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [enabled]);

  if (!enabled || !usage) return null;

  const highestLevel = usage.items.some((item) => item.level === "critical")
    ? "critical"
    : usage.items.some((item) => item.level === "warning")
      ? "warning"
      : "ok";

  if (!open && highestLevel === "ok") return null;

  return (
    <section className="border-b border-line bg-edp-navy/70 px-4 py-3 backdrop-blur-xl lg:px-8">
      <div
        className={`mx-auto max-w-7xl rounded-2xl border px-4 py-3 shadow-lg shadow-black/10 ${
          highestLevel === "critical"
            ? "border-red-400/40 bg-red-500/12"
            : highestLevel === "warning"
              ? "border-yellow-300/40 bg-yellow-300/10"
              : "border-edp/25 bg-edp/10"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-edp">
              <AlertTriangle size={18} />
            </span>
            <span>
              <span className="block text-sm font-bold text-white">Monitoramento de limites</span>
              <span className="block text-xs text-edp-muted">
                Aviso em {usage.warningPercent}% e crítico em {usage.criticalPercent}% do limite configurado.
              </span>
            </span>
          </span>
          <span className="text-xs font-bold text-edp">{open ? "Ocultar" : "Ver detalhes"}</span>
        </button>

        {open ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {usage.items.map((item) => {
              const Icon = iconFor(item.key);
              const percent = item.percent === null ? "-" : `${Math.round(item.percent)}%`;
              return (
                <div key={item.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <Icon size={16} className="text-edp" />
                      {item.label}
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        item.level === "critical"
                          ? "bg-red-500/20 text-red-200"
                          : item.level === "warning"
                            ? "bg-yellow-300/20 text-yellow-100"
                            : "bg-edp/15 text-edp"
                      }`}
                    >
                      {percent}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/20">
                    <div
                      className={`h-full rounded-full ${
                        item.level === "critical" ? "bg-red-400" : item.level === "warning" ? "bg-yellow-300" : "bg-edp"
                      }`}
                      style={{ width: `${Math.min(item.percent ?? 0, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-edp-muted">
                    {formatBytes(item.usedBytes)} de {formatBytes(item.limitBytes)}. {item.message}
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
