import { canEdit, requireUser } from "@/lib/auth";
import { PageTitle } from "@/components/page-title";
import { EmpresaForm } from "@/components/empresa-form";
import { createEmpresa } from "../../actions";

export default async function NovaEmpresaPage() {
  const user = await requireUser();
  return (
    <>
      <PageTitle title="Nova empresa" subtitle="Cadastro equivalente à entidade Empresa do Base44." />
      <EmpresaForm action={createEmpresa} canEdit={canEdit(user)} />
    </>
  );
}
