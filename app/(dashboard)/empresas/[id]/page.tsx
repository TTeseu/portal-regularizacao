import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canEdit, requireUser } from "@/lib/auth";
import { PageTitle } from "@/components/page-title";
import { EmpresaForm } from "@/components/empresa-form";
import { updateEmpresa } from "../../actions";
import { formatCNPJDisplay } from "@/lib/cnpj";

export default async function EmpresaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const empresa = await prisma.empresa.findUnique({ where: { id } });
  if (!empresa) notFound();
  return (
    <>
      <PageTitle
        title={empresa.nome}
        subtitle={`${formatCNPJDisplay(empresa.cnpj)} - ${empresa.contrato_numero || "Sem contrato"}`}
        action={<Link className="btn-secondary" href="/empresas">Voltar</Link>}
      />
      <EmpresaForm empresa={empresa} action={updateEmpresa.bind(null, id)} canEdit={canEdit(user)} />
    </>
  );
}
