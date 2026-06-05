import { Clock3 } from "lucide-react";
import { NotificaFacilProcessPage } from "@/components/notifica-facil-process-page";

export default function HistoricoCensoPage() {
  return (
    <NotificaFacilProcessPage
      title="Histórico CENSO"
      description="Histórico dos registros importados do censo, rastreando origem, datas, responsáveis e andamento documental."
      icon={<Clock3 size={24} />}
    />
  );
}
