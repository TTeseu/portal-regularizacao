import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { canEdit, requireUser } from "@/lib/auth";
import { EmpresaForm } from "@/components/empresa-form";
import { createEmpresa } from "@/app/(dashboard)/actions";

export default async function NovaEmpresaNotificaFacilPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link className="btn-secondary" href="/notifica-facil/empresas">
        <ArrowLeft size={16} />
        Voltar
      </Link>
      <div>
        <h1 className="text-3xl font-bold text-white">Nova empresa</h1>
        <p className="mt-2 text-sm text-edp-muted">Cadastro compartilhado entre Portal de Regularização e Notifica Fácil.</p>
      </div>
      <EmpresaForm action={createEmpresa} canEdit={canEdit(user)} redirectTo="/notifica-facil/empresas/:id" />
    </div>
  );
}
