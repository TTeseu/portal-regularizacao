import { requireUser } from "@/lib/auth";
import { HomeLanding } from "@/components/home-landing";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  const [regularizacaoNotifications, notificaFacilNotifications] = await Promise.all([
    prisma.notificacao.count(),
    prisma.notificaFacilNotification.count({
      where: { numero_notificacao: { not: null } }
    })
  ]);

  return (
    <HomeLanding
      user={{
        name: user.full_name || user.name || user.email,
        email: user.email,
        role: user.role
      }}
      operationMetrics={{
        notifications: regularizacaoNotifications + notificaFacilNotifications
      }}
    />
  );
}
