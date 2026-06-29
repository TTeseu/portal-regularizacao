"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const REFRESH_INTERVAL_MS = 10000;

const LIVE_EXACT_PATHS = new Set([
  "/regularizacao",
  "/notificacoes",
  "/empresas",
  "/usuarios",
  "/notifica-facil",
  "/notifica-facil/importar-censo",
  "/notifica-facil/historico-censo",
  "/notifica-facil/notificacao-pendencias",
  "/notifica-facil/regularizacao",
  "/notifica-facil/stand-by",
  "/notifica-facil/empresas"
]);

function isTypingOrEditing() {
  const active = document.activeElement;
  if (!active) return false;
  const tagName = active.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || active.getAttribute("contenteditable") === "true";
}

function shouldRefreshPath(pathname: string) {
  if (LIVE_EXACT_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/notificacoes?")) return true;
  return false;
}

export function AutoDataRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const enabled = shouldRefreshPath(pathname);

  useEffect(() => {
    if (!enabled) return;

    let lastRefresh = 0;
    const refresh = (force = false) => {
      if (document.visibilityState !== "visible") return;
      if (!force && isTypingOrEditing()) return;
      const now = Date.now();
      if (now - lastRefresh < 3000) return;
      lastRefresh = now;
      router.refresh();
    };

    const interval = window.setInterval(() => refresh(false), REFRESH_INTERVAL_MS);
    const onFocus = () => refresh(true);
    const onVisibilityChange = () => refresh(true);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, pathname, router, searchKey]);

  return null;
}
