"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

function successMessage(code: string | null, count: string | null) {
  const amount = Number(count || 0);
  const plural = amount === 1 ? "notificação" : "notificações";
  switch (code) {
    case "salvo":
      return "Salvo com sucesso.";
    case "notificacao-gerada":
      return "Notificação gerada com sucesso.";
    case "notificacoes-geradas":
      return amount > 0 ? `${amount} ${plural} gerada${amount === 1 ? "" : "s"} com sucesso.` : "Notificações geradas com sucesso.";
    case "notificacao-excluida":
      return "Notificação excluída com sucesso.";
    case "lote-excluido":
      return "Lote excluido com sucesso.";
    case "censos-historico":
      return amount > 0 ? `${amount} CENSO${amount === 1 ? "" : "s"} enviado${amount === 1 ? "" : "s"} ao histórico.` : "CENSO enviado ao histórico.";
    case "censos-clandestinos":
      return amount > 0 ? `${amount} CENSO${amount === 1 ? "" : "s"} marcado${amount === 1 ? "" : "s"} como clandestino.` : "CENSO marcado como clandestino.";
    case "censos-standby":
      return amount > 0 ? `${amount} CENSO${amount === 1 ? "" : "s"} enviado${amount === 1 ? "" : "s"} para stand-by.` : "CENSO enviado para stand-by.";
    case "empresa-excluida":
      return "Empresa excluída com sucesso.";
    case "resposta-cliente":
      return "Resposta do cliente registrada com sucesso.";
    default:
      return null;
  }
}

function errorMessage(code: string | null, empresa?: string | null) {
  switch (code) {
    case "empresa-bloqueada":
      return `Nao pode ser gerada uma notificacao${empresa ? ` para ${empresa}` : " para esta empresa"}. Para mais informacoes, consulte os superiores.`;
    case "empresa-vinculada":
      return "Não foi possível excluir: esta empresa possui registros vinculados.";
    case "arquivo":
      return "Selecione um arquivo válido para importar.";
    case "arquivo-grande":
      return "O arquivo é muito grande. Envie um arquivo de até 15 MB.";
    case "blob":
      return "Não foi possível anexar arquivo grande porque o armazenamento Blob não está configurado.";
    case "storage":
      return "Nao foi possivel anexar o arquivo porque o armazenamento R2/Blob nao esta configurado.";
    case "resposta-indisponivel":
      return "Esta notificação ainda não aceita resposta do cliente.";
    default:
      return null;
  }
}

export function FlashToast() {
  const searchParams = useSearchParams();
  const [dismissedKey, setDismissedKey] = useState("");
  const payload = useMemo(() => {
    const success = successMessage(searchParams.get("success"), searchParams.get("count"));
    const error = errorMessage(searchParams.get("error") || searchParams.get("erro"), searchParams.get("empresa"));
    const importados = searchParams.get("importados");
    const ignorados = searchParams.get("ignorados");
    if (success) return { tone: "success" as const, message: success };
    if (error) return { tone: "error" as const, message: error };
    if (importados !== null) {
      return {
        tone: "success" as const,
        message: `Importação concluída: ${importados} registro(s) importado(s)${ignorados !== null ? `, ${ignorados} ignorado(s)` : ""}.`
      };
    }
    return null;
  }, [searchParams]);
  const payloadKey = payload ? `${payload.tone}:${payload.message}` : "";

  if (!payload || dismissedKey === payloadKey) return null;

  const isError = payload.tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div className="fixed right-4 top-24 z-50 w-[calc(100vw-2rem)] max-w-md lg:right-8">
      <div
        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${
          isError
            ? "border-red-400/35 bg-red-950/90 text-red-50 shadow-red-950/30"
            : "border-edp/35 bg-[#102238]/95 text-white shadow-black/35"
        }`}
      >
        <Icon className={isError ? "mt-0.5 text-red-300" : "mt-0.5 text-edp"} size={20} />
        <p className="flex-1 text-sm font-semibold leading-6">{payload.message}</p>
        <button type="button" className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setDismissedKey(payloadKey)} aria-label="Fechar mensagem">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
