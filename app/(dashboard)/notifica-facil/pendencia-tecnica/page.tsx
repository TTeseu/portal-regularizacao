import { AlertTriangle } from "lucide-react";
import { NotificaFacilPendenciasPage } from "@/components/notifica-facil-pendencias-page";

export default function PendenciaTecnicaPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  return (
    <NotificaFacilPendenciasPage
      title="Pendência Técnica"
      description="Controle operacional das notificações marcadas com pendência técnica no Base44, incluindo status de PT, data de notificação e acompanhamento."
      mode="ativas"
      icon={<AlertTriangle size={24} />}
      searchParams={searchParams}
    />
  );
}
