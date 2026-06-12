import type { Empresa } from "@prisma/client";
import { EDIT_RESTRICTED_MESSAGE } from "@/lib/constants";
import { CNPJInput } from "@/components/cnpj-input";

type Props = {
  empresa?: Empresa | null;
  action: (formData: FormData) => Promise<void>;
  canEdit: boolean;
};

function value(empresa: Empresa | null | undefined, key: keyof Empresa) {
  const item = empresa?.[key];
  if (item instanceof Date) return item.toISOString();
  return typeof item === "string" || typeof item === "number" ? String(item) : "";
}

export function EmpresaForm({ empresa, action, canEdit }: Props) {
  return (
    <form action={action} className="space-y-6">
      {!canEdit ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {EDIT_RESTRICTED_MESSAGE}
        </div>
      ) : null}
      <fieldset disabled={!canEdit} className="panel grid gap-4 p-4 md:grid-cols-2 disabled:opacity-75">
        {[
          ["nome", "Nome"],
          ["cnpj", "CNPJ"],
          ["contrato_numero", "Contrato"],
          ["endereco", "Endereço"],
          ["cidade", "Cidade"],
          ["estado", "Estado"],
          ["celebrado_em", "Celebrado em"]
        ].map(([name, label]) => (
          <label key={name} className="block">
            <span className="label">{label}</span>
            {name === "cnpj" ? (
              <CNPJInput name={name} required={false} defaultValue={value(empresa, name as keyof Empresa)} />
            ) : (
              <input className="field mt-1" name={name} required={name === "nome"} defaultValue={value(empresa, name as keyof Empresa)} />
            )}
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
          <input type="checkbox" name="tem_clausula_11_6_3" defaultChecked={empresa?.tem_clausula_11_6_3 || false} />
          Possui cláusula 11.6.3
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
