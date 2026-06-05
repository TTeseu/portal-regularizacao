import { History } from "lucide-react";
import { NotificaFacilProcessPage } from "@/components/notifica-facil-process-page";

export default function HistoricoPendenciaTecnicaPage() {
  return (
    <NotificaFacilProcessPage
      title="Histórico Pendência Técnica"
      description="Histórico das pendências técnicas, mudanças de status, responsáveis e tratativas realizadas."
      icon={<History size={24} />}
    />
  );
}
