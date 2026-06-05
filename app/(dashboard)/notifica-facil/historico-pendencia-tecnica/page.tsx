import { History } from "lucide-react";
import { NotificaFacilPendenciasPage } from "@/components/notifica-facil-pendencias-page";

export default function HistoricoPendenciaTecnicaPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  return (
    <NotificaFacilPendenciasPage
      title="Historico Pendencia Tecnica"
      description="Historico das tratativas de pendencia tecnica, incluindo PT notificado, datas, logs e documentos vinculados."
      mode="historico"
      icon={<History size={24} />}
      searchParams={searchParams}
    />
  );
}
