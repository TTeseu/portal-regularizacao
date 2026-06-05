"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Box,
  Check,
  Edit3,
  ExternalLink,
  FileText,
  Lightbulb,
  Package,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X
} from "lucide-react";
import { CLAUSULA_11_6_3_TEXT, EDIT_RESTRICTED_MESSAGE } from "@/lib/constants";
import { buildNotificacaoHtml } from "@/lib/notificacao-html";

type EmpresaOption = {
  id: string;
  nome: string;
  cnpj: string | null;
  contrato_numero: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  tem_clausula_11_6_3: boolean;
  campo_11_6_3: string | null;
};

type AddressInput = {
  id: string;
  endereco: string;
  bairro: string;
  cidade: string;
};

type WizardForm = {
  tipo_notificacao: string;
  numero_oficio: string;
  data_notificacao: string;
  prazo_dias: string;
  lote_nome: string;
};

type Props = {
  empresas: EmpresaOption[];
  tipos: string[];
  canEdit: boolean;
  action: (formData: FormData) => Promise<void>;
};

const steps = [
  { id: 1, label: "Tipo" },
  { id: 2, label: "Empresas" },
  { id: 3, label: "Prévia" },
  { id: 4, label: "Quantidade" }
];

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function displayDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function makeAddress(partial: Partial<AddressInput> = {}): AddressInput {
  return {
    id: crypto.randomUUID(),
    endereco: partial.endereco || "",
    bairro: partial.bairro || "",
    cidade: partial.cidade || ""
  };
}

function cleanAddresses(enderecos: AddressInput[]) {
  const rows = enderecos
    .map(({ endereco, bairro, cidade }) => ({
      endereco: endereco.trim(),
      bairro: bairro.trim(),
      cidade: cidade.trim()
    }))
    .filter((row) => row.endereco || row.bairro || row.cidade);
  return rows.length > 0 ? rows : [{ endereco: "", bairro: "", cidade: "" }];
}

function buildPreviewHtml(empresa: EmpresaOption | undefined, form: WizardForm, enderecos: AddressInput[]) {
  return buildNotificacaoHtml({
    id: "preview",
    created_date: null,
    updated_date: null,
    created_by_id: null,
    created_by: null,
    is_sample: false,
    tipo_notificacao: form.tipo_notificacao,
    numero_oficio: form.numero_oficio || "Referência interna",
    data_notificacao: displayDate(form.data_notificacao),
    nota_atendimento: null,
    empresa: empresa?.nome || null,
    status_envio: null,
    vencimento: null,
    ano_vencimento: null,
    endereco: empresa?.endereco || null,
    bairro: null,
    cidade: empresa?.cidade || null,
    estado: empresa?.estado || null,
    contrato_numero: empresa?.contrato_numero || null,
    ac: null,
    numero_nome: null,
    celebrado_em: null,
    numero_parceiro: null,
    cnpj: empresa?.cnpj || null,
    empresa_rep: null,
    endereco_rep: null,
    bairro_rep: null,
    cidade_rep: null,
    estado_rep: null,
    campo_11_6_3: empresa?.tem_clausula_11_6_3 ? (empresa.campo_11_6_3 || CLAUSULA_11_6_3_TEXT) : null,
    empresa_1: null,
    rua_empresa_1: null,
    cidade_empresa_1: null,
    estado_empresa_1: null,
    cnpj_empresa_1: null,
    numero_contrato_1: null,
    empresa_2: null,
    endereco_empresa_2: null,
    cnpj_empresa_2: null,
    numero_contrato_2: null,
    endereco_notificacao: JSON.stringify(cleanAddresses(enderecos)),
    razao_social_condominio: null,
    endereco_condominio: null,
    cidade_condominio: null,
    estado_condominio: null,
    cnpj_condominio: null,
    condominio_identificado: null,
    data_reuniao: null,
    prazo_dias: form.prazo_dias,
    prazo_resposta: form.prazo_dias,
    lote_nome: form.lote_nome || null,
    lote_id: null,
    pdf_base64: null,
    pdfUrl: null,
    html_content: null,
    status: "Pendente",
    observacoes: null,
    retorno_cliente: null,
    anexo_url: null,
    anexo_nome: null,
    anexos: null,
    origem: "manual",
    visualizada: false,
    arquivada: false,
    sem_projeto: false,
    encaminhado_prefeitura: false,
    download_count: 0,
    last_downloaded_at: null,
    last_downloaded_by: null
  }, { preview: true });
}

export function GerarNotificacaoWizard({ empresas, tipos, canEdit, action }: Props) {
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [addressCount, setAddressCount] = useState("1");
  const [enderecos, setEnderecos] = useState<AddressInput[]>([makeAddress()]);
  const [massPasteOpen, setMassPasteOpen] = useState(false);
  const [massPaste, setMassPaste] = useState({ enderecos: "", bairros: "", cidades: "" });
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<WizardForm>({
    tipo_notificacao: tipos[0] || "",
    numero_oficio: "",
    data_notificacao: todayInput(),
    prazo_dias: "10 (dez) dias",
    lote_nome: ""
  });

  const selectedEmpresas = useMemo(
    () => empresas.filter((empresa) => selectedIds.includes(empresa.id)),
    [empresas, selectedIds]
  );
  const firstEmpresa = selectedEmpresas[0];
  const previewHtml = useMemo(() => buildPreviewHtml(firstEmpresa, form, enderecos), [firstEmpresa, form, enderecos]);
  const enderecosJson = useMemo(() => JSON.stringify(cleanAddresses(enderecos)), [enderecos]);
  const filteredEmpresas = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return empresas;
    return empresas.filter((empresa) =>
      [empresa.nome, empresa.cnpj, empresa.contrato_numero, empresa.cidade, empresa.estado]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [empresas, query]);

  function updateForm(key: keyof WizardForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleEmpresa(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function selectAllFiltered() {
    const ids = filteredEmpresas.map((empresa) => empresa.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    setSelectedIds((current) =>
      allSelected
        ? current.filter((id) => !ids.includes(id))
        : Array.from(new Set([...current, ...ids]))
    );
  }

  function updateEndereco(id: string, key: keyof Omit<AddressInput, "id">, value: string) {
    setEnderecos((current) => current.map((row) => row.id === id ? { ...row, [key]: value } : row));
  }

  function addEndereco(prefill = false) {
    setEnderecos((current) => [
      ...current,
      makeAddress(prefill ? {
        endereco: firstEmpresa?.endereco || "",
        cidade: [firstEmpresa?.cidade, firstEmpresa?.estado].filter(Boolean).join(" - ")
      } : {})
    ]);
  }

  function removeEndereco(id: string) {
    setEnderecos((current) => current.length === 1 ? current : current.filter((row) => row.id !== id));
  }

  function generateEnderecos() {
    const count = Math.min(Math.max(Number(addressCount) || 1, 1), 100);
    setAddressCount(String(count));
    setEnderecos(Array.from({ length: count }, () => makeAddress()));
  }

  function pasteMass() {
    setMassPasteOpen(true);
  }

  function importMassPaste() {
    const enderecosLines = splitLines(massPaste.enderecos);
    const bairrosLines = splitLines(massPaste.bairros);
    const cidadesLines = splitLines(massPaste.cidades);
    const count = Math.min(Math.max(enderecosLines.length, bairrosLines.length, cidadesLines.length), 100);
    if (count === 0) return;

    const rows = Array.from({ length: count }, (_, index) =>
      makeAddress({
        endereco: enderecosLines[index] || "",
        bairro: bairrosLines[index] || bairrosLines[0] || "",
        cidade: cidadesLines[index] || cidadesLines[0] || ""
      })
    ).filter((row) => row.endereco || row.bairro || row.cidade);

    if (rows.length > 0) {
      setEnderecos(rows);
      setAddressCount(String(rows.length));
      setMassPasteOpen(false);
    }
  }

  function resetForm() {
    setForm({
      tipo_notificacao: tipos[0] || "",
      numero_oficio: "",
      data_notificacao: todayInput(),
      prazo_dias: "10 (dez) dias",
      lote_nome: ""
    });
    setEnderecos([makeAddress()]);
    setAddressCount("1");
  }

  function openPreview(print = false) {
    const preview = window.open("", "_blank", "noopener,noreferrer,width=900,height=900");
    if (!preview) return;
    preview.document.write(previewHtml);
    preview.document.close();
    if (print) {
      preview.focus();
      preview.print();
    }
  }

  function goNext() {
    if (step === 1 && !form.tipo_notificacao) return;
    if (step === 2 && selectedIds.length === 0) return;
    setStep((current) => Math.min(current + 1, 4));
  }

  function submit(formData: FormData) {
    startTransition(() => {
      action(formData);
    });
  }

  const nextDisabled =
    !canEdit ||
    (step === 1 && !form.tipo_notificacao) ||
    (step === 2 && selectedIds.length === 0);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <div className="flex items-start gap-4">
          <Link href="/notificacoes" className="btn-secondary h-10 w-10 px-0" aria-label="Voltar">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-4xl font-bold leading-tight text-white">Gerar Notificação</h1>
            <p className="mt-1 text-base text-edp-muted">Selecione o tipo, empresas e visualize antes de gerar</p>
          </div>
        </div>

        <div className="mx-auto mt-9 flex max-w-xl items-center justify-center">
          {steps.map((item, index) => {
            const active = item.id <= step;
            return (
              <div key={item.id} className="flex items-start">
                <button type="button" onClick={() => setStep(item.id)} className="flex flex-col items-center gap-2 text-sm font-semibold">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full border ${active ? "border-edp bg-edp text-edp-navy" : "border-white/10 bg-white/10 text-edp-muted"}`}>
                    {item.id}
                  </span>
                  <span className={active ? "text-edp" : "text-edp-muted"}>{item.label}</span>
                </button>
                {index < steps.length - 1 ? (
                  <div className={`mx-2 mt-5 h-1 w-16 ${index + 1 < step ? "bg-edp" : "bg-white/10"}`} />
                ) : null}
              </div>
            );
          })}
        </div>
      </header>

      {!canEdit ? (
        <div className="mb-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          {EDIT_RESTRICTED_MESSAGE}
        </div>
      ) : null}

      <form action={submit} className="wizard-panel overflow-hidden">
        {selectedIds.map((id) => <input key={id} type="hidden" name="empresa_ids" value={id} />)}
        {Object.entries(form).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
        <input type="hidden" name="enderecos_json" value={enderecosJson} />

        {step === 1 ? (
          <WizardSection title="1. Selecione o Tipo de Notificação" subtitle="Escolha qual tipo de documento deseja gerar">
            <select className="field h-14 text-base" value={form.tipo_notificacao} onChange={(event) => updateForm("tipo_notificacao", event.target.value)}>
              <option value="">Selecione o tipo de notificação</option>
              {tipos.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
          </WizardSection>
        ) : null}

        {step === 2 ? (
          <WizardSection title="2. Selecione as Empresas" subtitle="Escolha quais empresas receberão a notificação">
            <div className="flex flex-col gap-3 md:flex-row">
              <label className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input className="field h-12 pl-12" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por empresa, CNPJ, contrato ou cidade..." />
              </label>
              <button type="button" className="btn-secondary h-12 px-5" onClick={selectAllFiltered}>
                Selecionar Todas
              </button>
            </div>
            <div className="rounded-md bg-slate-50 px-4 py-4 font-semibold text-slate-700">
              {selectedIds.length} empresa(s) selecionada(s)
            </div>
            <div className="max-h-80 overflow-auto rounded-md border border-line bg-card/80">
              {filteredEmpresas.map((empresa) => {
                const selected = selectedIds.includes(empresa.id);
                return (
                  <label
                    key={empresa.id}
                    className={`flex cursor-pointer gap-3 border-b border-line px-4 py-4 transition last:border-b-0 ${
                      selected
                        ? "bg-edp/12 text-white ring-1 ring-inset ring-edp/30"
                        : "bg-card/40 text-edp-muted hover:bg-white/[0.04]"
                    }`}
                  >
                    <input type="checkbox" className="mt-1 h-4 w-4 rounded border-white/20 bg-edp-navy accent-[#00E676]" checked={selected} onChange={() => toggleEmpresa(empresa.id)} />
                    <span>
                      <span className="block font-bold text-white">{empresa.nome}</span>
                      <span className="block text-sm text-edp-muted">CNPJ: {empresa.cnpj || "-"} | Contrato: {empresa.contrato_numero || "-"}</span>
                      <span className="block text-xs uppercase text-edp-muted/80">{empresa.cidade || "-"}{empresa.estado ? ` - ${empresa.estado}` : ""}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </WizardSection>
        ) : null}

        {step === 3 ? (
          <WizardSection
            title="3. Prévia dos Documentos"
            subtitle={`Visualize como ficarão os ${selectedIds.length || 0} PDF(s) gerados`}
            aside={
              <button type="button" className="btn-secondary border-red-300 text-red-600 hover:bg-red-50" onClick={resetForm}>
                <RotateCcw size={16} />
                Limpar Formulário
              </button>
            }
          >
            <div className="rounded-2xl border border-line bg-surface/60 p-5">
              <div className="mb-5 flex items-center gap-3 text-2xl font-bold text-white">
                <Edit3 className="text-edp" size={24} />
                Editar Informações dos Documentos
              </div>
              <p className="mb-7 text-sm text-edp-muted">As informações preenchidas serão aplicadas a TODOS os {selectedIds.length || 0} PDF(s).</p>

              <div className="space-y-5">
                <label className="block">
                  <span className="label">Número da Regularização *</span>
                  <input className="field mt-2" value={form.numero_oficio} onChange={(event) => updateForm("numero_oficio", event.target.value)} placeholder="Ex: 001/2025" />
                </label>
                <label className="block">
                  <span className="label">Data da Notificação *</span>
                  <input className="field mt-2" type="date" value={form.data_notificacao} onChange={(event) => updateForm("data_notificacao", event.target.value)} />
                  <span className="mt-2 block text-xs text-edp">Formato: São José dos Campos, {displayDate(form.data_notificacao)}</span>
                </label>
                <label className="block">
                  <span className="label">Prazo para Regularização *</span>
                  <select className="field mt-2" value={form.prazo_dias} onChange={(event) => updateForm("prazo_dias", event.target.value)}>
                    <option>10 (dez) dias</option>
                    <option>15 (quinze) dias</option>
                    <option>30 (trinta) dias</option>
                    <option>60 (sessenta) dias</option>
                  </select>
                  <span className="mt-2 block text-xs text-edp">Este prazo aparecerá no texto: &quot;em até X (por extenso) dias&quot;</span>
                </label>
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <div className="mb-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white">Endereços Irregulares (1 a 100)</h3>
                    <p className="mt-1 text-xs text-edp-muted">Você pode definir a quantidade (1-100) de uma vez, adicionar manualmente ou colar em massa.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input className="field h-10 w-32" value={addressCount} onChange={(event) => setAddressCount(event.target.value)} placeholder="Qtd (1-100)" />
                    <button type="button" className="btn-secondary h-10" onClick={generateEnderecos}>Gerar</button>
                    <button type="button" className="btn-secondary h-10" onClick={pasteMass}>
                      <Package size={16} />
                      Colar em Massa
                    </button>
                    <button type="button" className="btn-primary h-10" onClick={() => addEndereco(false)}>
                      <Plus size={16} />
                      Adicionar Endereço
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {enderecos.map((row, index) => (
                    <div key={row.id} className="overflow-hidden rounded-xl border border-line bg-card">
                      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
                        <span className="font-bold text-white">Endereço {index + 1}</span>
                        <button type="button" className="btn-secondary h-8 px-2 text-red-600" onClick={() => removeEndereco(row.id)} disabled={enderecos.length === 1}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="space-y-4 p-4">
                        <label className="block">
                          <span className="label">Endereço (Rua) *</span>
                          <input className="field mt-2" value={row.endereco} onChange={(event) => updateEndereco(row.id, "endereco", event.target.value)} placeholder="Ex: Rua das Flores, 123" />
                        </label>
                        <label className="block">
                          <span className="label">Bairro *</span>
                          <input className="field mt-2" value={row.bairro} onChange={(event) => updateEndereco(row.id, "bairro", event.target.value)} placeholder="Ex: Centro" />
                        </label>
                        <label className="block">
                          <span className="label">Cidade *</span>
                          <input className="field mt-2" value={row.cidade} onChange={(event) => updateEndereco(row.id, "cidade", event.target.value)} placeholder="Ex: São Paulo" />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <PreviewCard empresa={firstEmpresa} previewHtml={previewHtml} onPrint={() => openPreview(true)} onView={() => openPreview(false)} />
              </div>
            </div>
          </WizardSection>
        ) : null}

        {step === 4 ? (
          <WizardSection title="4. Quantidade" subtitle="Confira o lote antes de salvar as notificações">
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard label="Tipo" value={form.tipo_notificacao || "-"} />
              <SummaryCard label="Empresas" value={`${selectedIds.length} selecionada(s)`} />
              <SummaryCard label="Endereços" value={`${cleanAddresses(enderecos).length} por PDF`} />
            </div>
            <label className="mt-5 block">
              <span className="label">Nome do lote</span>
              <input className="field mt-1" value={form.lote_nome} onChange={(event) => updateForm("lote_nome", event.target.value)} placeholder={`${selectedIds.length} notificação(ões) - ${displayDate(form.data_notificacao)}`} />
            </label>
            <div className="mt-5 rounded-xl border border-edp/25 bg-edp/10 px-4 py-4 text-sm text-edp">
              Ao salvar, o sistema criará uma notificação para cada empresa selecionada, com HTML e URL de PDF gerados automaticamente.
            </div>
          </WizardSection>
        ) : null}

        <footer className="flex items-center justify-between border-t border-line bg-card px-6 py-5">
          <div className="flex gap-3">
            <button type="button" className="btn-secondary min-w-24" disabled={step === 1} onClick={() => setStep((current) => Math.max(current - 1, 1))}>Voltar</button>
            <Link href="/notificacoes" className="btn text-red-600 hover:bg-red-50">Cancelar</Link>
          </div>
          {step < 4 ? (
            <button type="button" className="btn-primary px-8" disabled={nextDisabled} onClick={goNext}>
              Continuar para {steps[step]?.label}
            </button>
          ) : (
            <button className="btn-primary px-8" disabled={!canEdit || isPending || selectedIds.length === 0}>
              <Save size={16} />
              {isPending ? "Salvando..." : `Salvar ${selectedIds.length} Notificação(ões)`}
            </button>
          )}
        </footer>
      </form>
      {massPasteOpen ? (
        <MassPasteModal
          value={massPaste}
          onChange={setMassPaste}
          onClose={() => setMassPasteOpen(false)}
          onImport={importMassPaste}
        />
      ) : null}
    </div>
  );
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function MassPasteModal({
  value,
  onChange,
  onClose,
  onImport
}: {
  value: { enderecos: string; bairros: string; cidades: string };
  onChange: (value: { enderecos: string; bairros: string; cidades: string }) => void;
  onClose: () => void;
  onImport: () => void;
}) {
  const enderecosCount = splitLines(value.enderecos).length;
  const bairrosCount = splitLines(value.bairros).length;
  const cidadesCount = splitLines(value.cidades).length;
  const hasRows = enderecosCount > 0 || bairrosCount > 0 || cidadesCount > 0;

  function update(key: keyof typeof value, nextValue: string) {
    onChange({ ...value, [key]: nextValue });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-card shadow-2xl shadow-black/30">
        <div className="flex items-start justify-between gap-4 border-b border-line bg-surface px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <Package size={19} className="text-edp" />
              Colar Endereços em Massa
            </div>
            <p className="mt-2 text-sm text-edp-muted">
              Cole as colunas do Excel. Cada linha será usada como um endereço diferente.
            </p>
          </div>
          <button type="button" className="btn-secondary h-9 w-9 px-0" onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-3">
            <MassPasteTextarea
              label="Endereços (Ruas) *"
              value={value.enderecos}
              onChange={(nextValue) => update("enderecos", nextValue)}
              placeholder={"Rua das Flores, 123\nAv. Brasil, 456\nRua do Sol, 789"}
              count={enderecosCount}
            />
            <MassPasteTextarea
              label="Bairros"
              value={value.bairros}
              onChange={(nextValue) => update("bairros", nextValue)}
              placeholder={"Centro\nJardim América\nVila Nova"}
              count={bairrosCount}
              hint="Se tiver menos, o primeiro será usado para todos."
            />
            <MassPasteTextarea
              label="Cidades"
              value={value.cidades}
              onChange={(nextValue) => update("cidades", nextValue)}
              placeholder={"São Paulo\nSão Paulo\nSão Paulo"}
              count={cidadesCount}
              hint="Se tiver menos, a primeira será usada para todos."
            />
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
            <Lightbulb size={17} className="mt-0.5 shrink-0 text-amber-300" />
            <span><strong>Dica:</strong> copie as colunas do Excel e cole aqui. Cada célula vira uma linha.</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line bg-surface px-6 py-5">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={onImport} disabled={!hasRows}>
            Importar Endereços
          </button>
        </div>
      </div>
    </div>
  );
}

function MassPasteTextarea({
  label,
  value,
  onChange,
  placeholder,
  count,
  hint
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  count: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea
        className="field mt-2 min-h-40 resize-y leading-relaxed"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <span className="mt-2 block text-xs text-edp-muted">{count} linha{count === 1 ? "" : "s"}</span>
      {hint ? <span className="mt-1 block text-xs text-edp">{hint}</span> : null}
    </label>
  );
}

function WizardSection({ title, subtitle, aside, children }: { title: string; subtitle: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-line bg-surface px-6 py-7">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="mt-2 text-edp-muted">{subtitle}</p>
        </div>
        {aside}
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </>
  );
}

function PreviewCard({ empresa, previewHtml, onPrint, onView }: { empresa?: EmpresaOption; previewHtml: string; onPrint: () => void; onView: () => void }) {
  return (
    <div className="rounded-2xl border border-line bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-surface px-4 py-4">
        <div className="flex gap-3">
          <FileText className="mt-1 text-edp" size={20} />
          <div>
            <h3 className="font-bold text-white">PDF 1 - {empresa?.nome || "Empresa selecionada"}</h3>
            <p className="text-sm text-edp-muted">CNPJ: {empresa?.cnpj || "-"} | Contrato: {empresa?.contrato_numero || "-"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={onPrint}><Printer size={16} />Imprimir</button>
          <button type="button" className="btn-secondary" onClick={onView}><ExternalLink size={16} />Visualizar</button>
        </div>
      </div>
      <div className="h-[420px] overflow-auto bg-edp-navy px-8 py-4">
        <div className="origin-top scale-[0.58]" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-edp-muted"><Box size={14} />{label}</div>
      <div className="mt-2 flex items-center gap-2 text-base font-bold text-white"><Check size={16} className="text-edp" />{value}</div>
    </div>
  );
}
