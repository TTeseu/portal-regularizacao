import { Upload } from "lucide-react";
import { NotificaFacilProcessPage } from "@/components/notifica-facil-process-page";

export default function ImportarCsvPage() {
  return (
    <NotificaFacilProcessPage
      title="Importar CSV"
      description="Importação de bases CSV do processo Telecom à Revelia, mantendo os dados separados do Portal de Regularização."
      icon={<Upload size={24} />}
    />
  );
}
