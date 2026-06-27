import { History } from "lucide-react";
import { NotificaFacilPendenciasPage } from "@/components/notifica-facil-pendencias-page";

export default function HistoricoRegularizacaoPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  return (
    <NotificaFacilPendenciasPage
      title="Histórico Regularização"
      description="Histórico das notificações de regularização, incluindo registros marcados como regularizados, datas, logs e documentos vinculados."
      mode="historico"
      process="regularizacao"
      icon={<History size={24} />}
      searchParams={searchParams}
    />
  );
}
