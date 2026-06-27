import { CheckCircle2 } from "lucide-react";
import { NotificaFacilPendenciasPage } from "@/components/notifica-facil-pendencias-page";

export default function RegularizacaoPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  return (
    <NotificaFacilPendenciasPage
      title="Regularização"
      description="Controle operacional das notificações de regularização no Notifica Fácil, com o mesmo fluxo documental, lotes, PDF e histórico do processo de pendência técnica."
      mode="ativas"
      process="regularizacao"
      icon={<CheckCircle2 size={24} />}
      searchParams={searchParams}
    />
  );
}
