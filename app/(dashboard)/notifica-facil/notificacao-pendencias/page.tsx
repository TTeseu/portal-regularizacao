import { FileClock } from "lucide-react";
import { NotificaFacilPendenciasPage } from "@/components/notifica-facil-pendencias-page";

export default function NotificacaoPendenciasPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  return (
    <NotificaFacilPendenciasPage
      title="Notificacao das Pendencias"
      description="Fila de pendencias tecnicas ainda nao marcadas como PT notificado, seguindo o processo documental do Base44."
      mode="notificar"
      icon={<FileClock size={24} />}
      searchParams={searchParams}
    />
  );
}
