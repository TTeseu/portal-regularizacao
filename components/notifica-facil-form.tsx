import type { NotificaFacilNotification } from "@prisma/client";
import { Save } from "lucide-react";

const STATUS_OPTIONS = [
  "Aguardando assinatura Gestor",
  "Notificacao Encaminhada por E-mail.",
  "Resposta do Cliente - Anexo do E-mail.",
  "Entrega do Projeto ou Projeto Pendente. (10 dias)",
  "Nao houve resposta do Cliente - Valores Informar o Faturamento.",
  "Finalizar Notificacao."
];

function jsonLines(value: unknown, keys: string[]) {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const record = item as Record<string, unknown>;
      return keys.map((key) => String(record[key] ?? "")).join("; ");
    })
    .filter(Boolean)
    .join("\n");
}

export function NotificaFacilForm({
  notification,
  action,
  canEdit = true
}: {
  notification?: NotificaFacilNotification | null;
  action: (formData: FormData) => void | Promise<void>;
  canEdit?: boolean;
}) {
  return (
    <form action={action} className="panel overflow-hidden">
      <div className="border-b border-line bg-surface px-6 py-5">
        <h2 className="text-xl font-bold text-white">Dados da notificacao</h2>
        <p className="mt-1 text-sm text-edp-muted">Campos preservados do Notifica Facil/Base44, separados do Portal de Regularizacao.</p>
      </div>

      <fieldset disabled={!canEdit} className="space-y-6 p-6 disabled:opacity-60">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="xl:col-span-2">
            <span className="label">Empresa *</span>
            <input className="field mt-1" name="empresa" required defaultValue={notification?.empresa || ""} />
          </label>
          <label>
            <span className="label">Status</span>
            <select className="field mt-1" name="status" defaultValue={notification?.status || STATUS_OPTIONS[0]}>
              {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Tipo de servico</span>
            <input className="field mt-1" name="tipo_servico" defaultValue={notification?.tipo_servico || ""} />
          </label>
          <label>
            <span className="label">Numero protocolo</span>
            <input className="field mt-1" name="numero_protocolo" defaultValue={notification?.numero_protocolo || ""} />
          </label>
          <label>
            <span className="label">Numero notificacao</span>
            <input className="field mt-1" name="numero_notificacao" defaultValue={notification?.numero_notificacao || ""} />
          </label>
          <label>
            <span className="label">Registro censo</span>
            <input className="field mt-1" name="numero_registro_censo" defaultValue={notification?.numero_registro_censo || ""} />
          </label>
          <label>
            <span className="label">Ordem de venda</span>
            <input className="field mt-1" name="ordem_venda" defaultValue={notification?.ordem_venda || ""} />
          </label>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="label">Destinatario nome</span>
            <input className="field mt-1" name="destinatario_nome" defaultValue={notification?.destinatario_nome || ""} />
          </label>
          <label>
            <span className="label">Destinatario CPF</span>
            <input className="field mt-1" name="destinatario_cpf" defaultValue={notification?.destinatario_cpf || ""} />
          </label>
          <label className="xl:col-span-2">
            <span className="label">Destinatario endereco</span>
            <input className="field mt-1" name="destinatario_endereco" defaultValue={notification?.destinatario_endereco || ""} />
          </label>
          <label>
            <span className="label">Valor cobrado</span>
            <input className="field mt-1" name="valor_cobrado" type="number" step="0.01" defaultValue={notification?.valor_cobrado ?? ""} />
          </label>
          <label>
            <span className="label">Data notificacao</span>
            <input className="field mt-1" name="data_notificacao" type="date" defaultValue={notification?.data_notificacao || ""} />
          </label>
          <label>
            <span className="label">Prazo resposta</span>
            <input className="field mt-1" name="prazo_resposta" defaultValue={notification?.prazo_resposta || ""} />
          </label>
          <label>
            <span className="label">Data email encaminhado</span>
            <input className="field mt-1" name="data_email_encaminhado" type="date" defaultValue={notification?.data_email_encaminhado || ""} />
          </label>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="label">CNPJ</span>
            <input className="field mt-1" name="cnpj" defaultValue={notification?.cnpj || ""} />
          </label>
          <label>
            <span className="label">Contrato</span>
            <input className="field mt-1" name="contrato_numero" defaultValue={notification?.contrato_numero || ""} />
          </label>
          <label>
            <span className="label">AC</span>
            <input className="field mt-1" name="ac" defaultValue={notification?.ac || ""} />
          </label>
          <label>
            <span className="label">Numero parceiro</span>
            <input className="field mt-1" name="numero_parceiro" defaultValue={notification?.numero_parceiro || ""} />
          </label>
          <label>
            <span className="label">Endereco empresa</span>
            <input className="field mt-1" name="empresa_endereco" defaultValue={notification?.empresa_endereco || ""} />
          </label>
          <label>
            <span className="label">Bairro empresa</span>
            <input className="field mt-1" name="empresa_bairro" defaultValue={notification?.empresa_bairro || ""} />
          </label>
          <label>
            <span className="label">Cidade empresa</span>
            <input className="field mt-1" name="empresa_cidade" defaultValue={notification?.empresa_cidade || ""} />
          </label>
          <label>
            <span className="label">Estado empresa</span>
            <input className="field mt-1" name="empresa_estado" defaultValue={notification?.empresa_estado || ""} />
          </label>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="label">Textos contratuais</span>
            <textarea className="field mt-1 min-h-36" name="texto_contrato_7_14" defaultValue={notification?.texto_contrato_7_14 || ""} />
          </label>
          <label>
            <span className="label">Ocupacao a revelia / complementos</span>
            <textarea className="field mt-1 min-h-36" name="texto_ocupacao_revelia" defaultValue={notification?.texto_ocupacao_revelia || ""} />
          </label>
          <label>
            <span className="label">Enderecos revelia</span>
            <textarea
              className="field mt-1 min-h-36"
              name="enderecos_revelia"
              placeholder="Endereco; Bairro; Cidade"
              defaultValue={jsonLines(notification?.enderecos_revelia, ["endereco", "bairro", "cidade"])}
            />
          </label>
          <label>
            <span className="label">Anexos resposta email</span>
            <textarea
              className="field mt-1 min-h-36"
              name="anexos_resposta_email"
              placeholder="Nome; URL"
              defaultValue={jsonLines(notification?.anexos_resposta_email, ["nome", "url"])}
            />
          </label>
          <label className="md:col-span-2">
            <span className="label">Observacoes</span>
            <textarea className="field mt-1 min-h-28" name="observacoes" defaultValue={notification?.observacoes || ""} />
          </label>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold">
            <input type="checkbox" name="is_draft" defaultChecked={notification?.is_draft || false} />
            Rascunho
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold">
            <input type="checkbox" name="is_standby" defaultChecked={notification?.is_standby || false} />
            Stand-by
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold">
            <input type="checkbox" name="pendencia_tecnica" defaultChecked={notification?.pendencia_tecnica || false} />
            Pendencia tecnica
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold">
            <input type="checkbox" name="pt_notificado" defaultChecked={notification?.pt_notificado || false} />
            PT notificado
          </label>
        </section>

        <div className="flex justify-end">
          <button className="btn-primary" type="submit">
            <Save size={16} />
            Salvar e gerar PDF
          </button>
        </div>
      </fieldset>
    </form>
  );
}
