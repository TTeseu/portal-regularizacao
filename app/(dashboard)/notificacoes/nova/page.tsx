import { GerarNotificacaoWizard } from "@/components/gerar-notificacao-wizard";
import { canEdit, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotificacoesWizard } from "../../actions";

export default async function NovaNotificacaoPage() {
  const user = await requireUser();
  const [empresas, tiposRows] = await Promise.all([
    prisma.empresa.findMany({
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        cnpj: true,
        contrato_numero: true,
        endereco: true,
        cidade: true,
        estado: true,
        tem_clausula_11_6_3: true,
        campo_11_6_3: true
      }
    }),
    prisma.notificacao.findMany({
      distinct: ["tipo_notificacao"],
      where: { tipo_notificacao: { not: null } },
      select: { tipo_notificacao: true },
      take: 20
    })
  ]);

  const tipos = tiposRows
    .map((row) => row.tipo_notificacao)
    .filter((tipo): tipo is string => Boolean(tipo));

  return (
    <GerarNotificacaoWizard
      empresas={empresas}
      tipos={tipos}
      canEdit={canEdit(user)}
      action={createNotificacoesWizard}
    />
  );
}
