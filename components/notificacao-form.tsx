import type { Notificacao } from "@prisma/client";
import { STATUS_OPTIONS, ORIGEM_OPTIONS, EDIT_RESTRICTED_MESSAGE } from "@/lib/constants";

type Props = {
  notificacao?: Notificacao | null;
  action: (formData: FormData) => Promise<void>;
  canEdit: boolean;
};

const fields = [
  ["tipo_notificacao", "Tipo da notificação"],
  ["numero_oficio", "Número do ofício"],
  ["data_notificacao", "Data da notificação"],
  ["nota_atendimento", "Nota de atendimento"],
  ["empresa", "Empresa"],
  ["cnpj", "CNPJ"],
  ["contrato_numero", "Contrato"],
  ["vencimento", "Vencimento"],
  ["ano_vencimento", "Ano vencimento"],
  ["cidade", "Cidade"],
  ["estado", "Estado"],
  ["bairro", "Bairro"],
  ["endereco", "Endereço"],
  ["ac", "A/C"],
  ["numero_nome", "Nº/Nome"],
  ["celebrado_em", "Celebrado em"],
  ["numero_parceiro", "Número parceiro"],
  ["lote_nome", "Lote"],
  ["lote_id", "ID do lote"],
  ["prazo_dias", "Prazo em dias"],
  ["prazo_resposta", "Prazo resposta"]
] as const;

function value(notificacao: Notificacao | null | undefined, key: keyof Notificacao) {
  const item = notificacao?.[key];
  if (typeof item === "boolean") return item ? "true" : "false";
  if (item instanceof Date) return item.toISOString();
  return typeof item === "string" || typeof item === "number" ? String(item) : "";
}

export function NotificacaoForm({ notificacao, action, canEdit }: Props) {
  return (
    <form action={action} className="space-y-6">
      {!canEdit ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {EDIT_RESTRICTED_MESSAGE}
        </div>
      ) : null}

      <fieldset disabled={!canEdit} className="space-y-6 disabled:opacity-75">
        <section className="panel p-4">
          <h2 className="mb-4 text-sm font-bold text-ink">Dados principais</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {fields.map(([name, label]) => (
              <label key={name} className="block">
                <span className="label">{label}</span>
                <input className="field mt-1" name={name} defaultValue={value(notificacao, name)} />
              </label>
            ))}
            <label className="block">
              <span className="label">Status</span>
              <select className="field mt-1" name="status" defaultValue={value(notificacao, "status") || "Pendente"}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Origem</span>
              <select className="field mt-1" name="origem" defaultValue={value(notificacao, "origem") || "manual"}>
                {ORIGEM_OPTIONS.map((origem) => (
                  <option key={origem} value={origem}>{origem}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="panel p-4">
          <h2 className="mb-4 text-sm font-bold text-ink">Representante, contrato e cláusula</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["empresa_rep", "Empresa representante"],
              ["endereco_rep", "Endereço representante"],
              ["bairro_rep", "Bairro representante"],
              ["cidade_rep", "Cidade representante"],
              ["estado_rep", "Estado representante"],
              ["campo_11_6_3", "Campo 11.6.3"]
            ].map(([name, label]) => (
              <label key={name} className="block">
                <span className="label">{label}</span>
                <input className="field mt-1" name={name} defaultValue={value(notificacao, name as keyof Notificacao)} />
              </label>
            ))}
          </div>
        </section>

        <section className="panel p-4">
          <h2 className="mb-4 text-sm font-bold text-ink">Endereços, retorno e anexos</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="label">Endereços da notificação</span>
              <textarea className="field mt-1 min-h-28" name="endereco_notificacao" defaultValue={value(notificacao, "endereco_notificacao")} />
            </label>
            <label className="block">
              <span className="label">Anexo nome</span>
              <input className="field mt-1" name="anexo_nome" defaultValue={value(notificacao, "anexo_nome")} />
            </label>
            <label className="block">
              <span className="label">Anexo URL</span>
              <input className="field mt-1" name="anexo_url" defaultValue={value(notificacao, "anexo_url")} />
            </label>
            <label className="block">
              <span className="label">Observações</span>
              <textarea className="field mt-1 min-h-24" name="observacoes" defaultValue={value(notificacao, "observacoes")} />
            </label>
            <label className="block">
              <span className="label">Retorno do cliente</span>
              <textarea className="field mt-1 min-h-24" name="retorno_cliente" defaultValue={value(notificacao, "retorno_cliente")} />
            </label>
          </div>
        </section>

        <section className="panel p-4">
          <h2 className="mb-4 text-sm font-bold text-ink">Controle</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["visualizada", "Visualizada"],
              ["arquivada", "Arquivada"],
              ["sem_projeto", "Sem projeto"],
              ["encaminhado_prefeitura", "Encaminhado prefeitura"]
            ].map(([name, label]) => (
              <label key={name} className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name={name} defaultChecked={Boolean(notificacao?.[name as keyof Notificacao])} />
                {label}
              </label>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button className="btn-primary" type="submit">Salvar</button>
        </div>
      </fieldset>
    </form>
  );
}
