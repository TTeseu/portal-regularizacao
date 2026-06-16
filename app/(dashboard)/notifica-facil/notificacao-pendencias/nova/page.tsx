import { GerarNotificacaoWizard } from "@/components/gerar-notificacao-wizard";
import { canEdit, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotificaFacilPendenciaWizard } from "../../actions";

export default async function NovaNotificacaoPendenciaPage() {
  const user = await requireUser();
  const [baseEmpresas, tiposRows] = await Promise.all([
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
    prisma.notificaFacilNotification.findMany({
      distinct: ["tipo_servico"],
      where: { tipo_servico: { not: null } },
      select: { tipo_servico: true },
      take: 20
    })
  ]);

  const empresas = baseEmpresas.map((empresa) => ({
    id: empresa.id,
    nome: empresa.nome,
    cnpj: empresa.cnpj,
    contrato_numero: empresa.contrato_numero,
    endereco: empresa.endereco,
    cidade: empresa.cidade,
    estado: empresa.estado,
    tem_clausula_11_6_3: empresa.tem_clausula_11_6_3,
    campo_11_6_3: empresa.campo_11_6_3
  }));

  const tipos = Array.from(new Set([
    "Ocupação Irregular - Descumprimento ao Contrato e Normas Técnicas",
    ...tiposRows.map((row) => row.tipo_servico).filter((tipo): tipo is string => Boolean(tipo))
  ]));

  return (
    <GerarNotificacaoWizard
      empresas={empresas}
      tipos={tipos}
      canEdit={canEdit(user)}
      action={createNotificaFacilPendenciaWizard}
      backHref="/notifica-facil/notificacao-pendencias"
      cancelHref="/notifica-facil/notificacao-pendencias"
    />
  );
}
