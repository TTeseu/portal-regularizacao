import { AlertTriangle } from "lucide-react";
import { NotificaFacilProcessPage } from "@/components/notifica-facil-process-page";

export default function PendenciaTecnicaPage() {
  return (
    <NotificaFacilProcessPage
      title="Pendência Técnica"
      description="Controle das notificações com pendência técnica, incluindo análise, status, registros de PT e acompanhamento."
      icon={<AlertTriangle size={24} />}
    />
  );
}
