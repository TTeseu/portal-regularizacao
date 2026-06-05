import { Bell } from "lucide-react";
import { NotificaFacilProcessPage } from "@/components/notifica-facil-process-page";

export default function ImportarCensoPage() {
  return (
    <NotificaFacilProcessPage
      title="Importar CENSO"
      description="Entrada de registros vindos do censo para criação e acompanhamento de notificações do Notifica Fácil."
      icon={<Bell size={24} />}
    />
  );
}
