import { FileClock } from "lucide-react";
import { NotificaFacilPendenciasPage } from "@/components/notifica-facil-pendencias-page";

export default function NotificacaoPendenciasPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  return (
    <NotificaFacilPendenciasPage
      title="Notificação das Pendências"
      description="Notificações de pendência técnica geradas no Notifica Fácil, agrupadas por lote ou registro quando houver mais de uma notificação relacionada."
      mode="notificar"
      icon={<FileClock size={24} />}
      searchParams={searchParams}
    />
  );
}
