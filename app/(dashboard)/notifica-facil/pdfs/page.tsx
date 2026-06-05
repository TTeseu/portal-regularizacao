import { FileArchive } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { NotificaFacilProcessPage } from "@/components/notifica-facil-process-page";

export default async function TodosPdfsPage() {
  const total = await prisma.notificaFacilNotification.count({ where: { OR: [{ pdf_url: { not: null } }, { pdf_base64: { not: null } }] } });
  return (
    <NotificaFacilProcessPage
      title="Todos os PDFs"
      description={`${total} PDF(s) já armazenados/cacheados no módulo Notifica Fácil.`}
      icon={<FileArchive size={24} />}
    />
  );
}
