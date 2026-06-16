import type { Empresa } from "@prisma/client";
import { EDIT_RESTRICTED_MESSAGE } from "@/lib/constants";
import { CNPJInput } from "@/components/cnpj-input";

type Props = {
  empresa?: Empresa | null;
  action: (formData: FormData) => Promise<void>;
  canEdit: boolean;
  redirectTo?: string;
};

function value(empresa: Empresa | null | undefined, key: keyof Empresa) {
  const item = empresa?.[key];
  if (item instanceof Date) return item.toISOString();
  return typeof item === "string" || typeof item === "number" ? String(item) : "";
}

const basicFields: Array<[keyof Empresa, string, boolean?]> = [
  ["nome", "Nome", true],
  ["cnpj", "CNPJ"],
  ["contrato_numero", "Contrato"],
  ["endereco", "Endereco"],
  ["bairro", "Bairro"],
  ["cidade", "Cidade"],
  ["estado", "Estado"],
  ["celebrado_em", "Celebrado em"],
  ["numero_parceiro", "Numero parceiro"],
  ["status_envio_notificacao", "Status envio notificacao"],
  ["vencimento_contrato", "Vencimento contrato"],
  ["ano_vencimento_contrato", "Ano vencimento contrato"],
  ["ac", "A/C"],
  ["numero_nome_empresa", "Numero/Nome empresa"],
  ["empresa_incorporada", "Empresa incorporada"],
  ["valor_atualizado", "Valor atualizado"],
  ["multa", "Multa"],
  ["retroativo", "Retroativo"]
];

const textFields: Array<[keyof Empresa, string]> = [
  ["texto_contrato_7_14", "Texto contrato 7.14"],
  ["texto_ocupacao_revelia", "Texto ocupacao revelia"],
  ["texto_23_3", "Texto 23.3"],
  ["texto_24_1", "Texto 24.1"],
  ["texto_24_3", "Texto 24.3"]
];

export function EmpresaForm({ empresa, action, canEdit, redirectTo }: Props) {
  return (
    <form action={action} className="space-y-6">
      {redirectTo ? <input type="hidden" name="redirect_to" value={redirectTo} /> : null}
      {!canEdit ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {EDIT_RESTRICTED_MESSAGE}
        </div>
      ) : null}
      <fieldset disabled={!canEdit} className="panel grid gap-4 p-4 md:grid-cols-2 disabled:opacity-75">
        {basicFields.map(([name, label, required]) => (
          <label key={name} className="block">
            <span className="label">{label}</span>
            {name === "cnpj" ? (
              <CNPJInput name={name} required={false} defaultValue={value(empresa, name)} />
            ) : (
              <input className="field mt-1" name={name} required={Boolean(required)} defaultValue={value(empresa, name)} />
            )}
          </label>
        ))}

        {textFields.map(([name, label]) => (
          <label key={name} className="block md:col-span-2">
            <span className="label">{label}</span>
            <textarea className="field mt-1 min-h-24" name={name} defaultValue={value(empresa, name)} />
          </label>
        ))}

        <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
          <input type="checkbox" name="tem_clausula_11_6_3" defaultChecked={empresa?.tem_clausula_11_6_3 || false} />
          Possui clausula 11.6.3
        </label>
        <label className="block md:col-span-2">
          <span className="label">Campo 11.6.3</span>
          <textarea className="field mt-1 min-h-24" name="campo_11_6_3" defaultValue={value(empresa, "campo_11_6_3")} />
        </label>
        <div className="flex justify-end md:col-span-2">
          <button className="btn-primary" type="submit">Salvar</button>
        </div>
      </fieldset>
    </form>
  );
}
