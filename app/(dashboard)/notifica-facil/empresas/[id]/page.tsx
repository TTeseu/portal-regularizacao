import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { canEdit, requireUser } from "@/lib/auth";
import { deleteEmpresa, updateEmpresa } from "@/app/(dashboard)/actions";
import { EmpresaForm } from "@/components/empresa-form";
import { formatCNPJDisplay } from "@/lib/cnpj";
import { prisma } from "@/lib/prisma";

export default async function EmpresaNotificaFacilDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const empresa = await prisma.empresa.findUnique({ where: { id } });
  if (!empresa) notFound();
  const mayEdit = canEdit(user);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <Link className="btn-secondary mb-4" href="/notifica-facil/empresas">
            <ArrowLeft size={16} />
            Voltar
          </Link>
          <h1 className="text-3xl font-bold text-white">{empresa.nome}</h1>
          <p className="mt-2 text-sm text-edp-muted">{formatCNPJDisplay(empresa.cnpj)} - {empresa.contrato_numero || "Sem contrato"}</p>
        </div>
        {mayEdit ? (
          <form action={deleteEmpresa.bind(null, empresa.id)}>
            <input type="hidden" name="redirect_to" value="/notifica-facil/empresas" />
            <button className="btn-danger" type="submit">
              <Trash2 size={16} />
              Excluir
            </button>
          </form>
        ) : null}
      </div>
      <EmpresaForm
        empresa={empresa}
        action={updateEmpresa.bind(null, empresa.id)}
        canEdit={mayEdit}
        redirectTo="/notifica-facil/empresas/:id"
      />
    </div>
  );
}
