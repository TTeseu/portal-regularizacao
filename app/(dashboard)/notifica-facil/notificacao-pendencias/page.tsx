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
      description="Fila de pendências técnicas ainda não marcadas como PT notificado, seguindo o processo documental do Base44."
      mode="notificar"
      icon={<FileClock size={24} />}
      searchParams={searchParams}
    />
  );
}
