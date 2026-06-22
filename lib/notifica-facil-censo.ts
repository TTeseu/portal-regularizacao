import { Prisma } from "@prisma/client";

export const activeCensoWhere = {
  numero_registro_censo: { not: null },
  numero_notificacao: null,
  censo_finalizado: false,
  is_standby: false,
  pendencia_tecnica: false
} satisfies Prisma.NotificaFacilNotificationWhereInput;

export const historyCensoWhere = {
  numero_registro_censo: { not: null },
  numero_notificacao: null,
  OR: [
    { censo_finalizado: true },
    { status: { in: ["Finalizado", "Clandestino", "Excluído", "Excluido"] } }
  ]
} satisfies Prisma.NotificaFacilNotificationWhereInput;
