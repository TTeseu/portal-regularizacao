import { FileClock } from "lucide-react";
import { NotificaFacilProcessPage } from "@/components/notifica-facil-process-page";

export default function NotificacaoPendenciasPage() {
  return (
    <NotificaFacilProcessPage
      title="Notificação das Pendências"
      description="Acompanhamento das notificações relacionadas a pendências, respostas e evolução do fluxo documental."
      icon={<FileClock size={24} />}
    />
  );
}
