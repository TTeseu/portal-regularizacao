import { Clock3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { NotificaFacilProcessPage } from "@/components/notifica-facil-process-page";

export default async function StandByPage() {
  const total = await prisma.notificaFacilNotification.count({ where: { is_standby: true } });
  return (
    <NotificaFacilProcessPage
      title="Stand-by"
      description={`${total} notificação(ões) atualmente marcadas como stand-by no módulo Notifica Fácil.`}
      icon={<Clock3 size={24} />}
    />
  );
}
