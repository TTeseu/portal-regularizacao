import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { canEdit, requireUser } from "@/lib/auth";
import { NotificaFacilForm } from "@/components/notifica-facil-form";
import { createNotificaFacilNotification } from "../actions";

export default async function NovaNotificaFacilPage() {
  const user = await requireUser();
  const mayEdit = canEdit(user);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link className="btn-secondary mb-4" href="/notifica-facil">
            <ArrowLeft size={16} />
            Voltar
          </Link>
          <h1 className="text-3xl font-bold text-white">Nova notificacao - Notifica Facil</h1>
          <p className="mt-2 text-sm text-edp-muted">Ao salvar, o HTML e o PDF serao gerados e armazenados para downloads futuros.</p>
        </div>
      </div>
      <NotificaFacilForm action={createNotificaFacilNotification} canEdit={mayEdit} />
    </div>
  );
}
