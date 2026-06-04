import { canEdit, requireUser } from "@/lib/auth";
import { PageTitle } from "@/components/page-title";
import { NotificacaoForm } from "@/components/notificacao-form";
import { createNotificacao } from "../../actions";

export default async function NovaNotificacaoPage() {
  const user = await requireUser();
  return (
    <>
      <PageTitle title="Nova notificação" subtitle="Cadastro manual preservando os campos do Base44." />
      <NotificacaoForm action={createNotificacao} canEdit={canEdit(user)} />
    </>
  );
}
