import { AlertTriangle } from "lucide-react";
import { NotificaFacilPendenciasPage } from "@/components/notifica-facil-pendencias-page";

export default function PendenciaTecnicaPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  return (
    <NotificaFacilPendenciasPage
      title="Pendencia Tecnica"
      description="Controle operacional das notificacoes marcadas com pendencia tecnica no Base44, incluindo status de PT, data de notificacao e acompanhamento."
      mode="ativas"
      icon={<AlertTriangle size={24} />}
      searchParams={searchParams}
    />
  );
}
