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
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search
} from "lucide-react";
import { EDIT_RESTRICTED_MESSAGE } from "@/lib/constants";

type EmpresaOption = {
  id: string;
  nome: string;
  cnpj: string | null;
  contrato_numero: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
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

function escapeHtml(value?: string | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPreviewHtml(empresa: EmpresaOption | undefined, form: WizardForm) {
  const nome = empresa?.nome || "EMPRESA";
  const contrato = empresa?.contrato_numero || "";
  const cidade = empresa?.cidade || "";
  const estado = empresa?.estado || "";
  const endereco = form.endereco_notificacao || empresa?.endereco || "";

  return `
    <article style="width:794px;min-height:760px;background:white;padding:48px 80px;font-family:Georgia,'Times New Roman',serif;color:#050505;font-size:16px;line-height:1.42;">
      <header style="display:flex;justify-content:space-between;margin-bottom:22px;font-weight:700;">
        <div>Portal de Regularização</div>
        <div style="text-align:right;">
          <div>São José dos Campos, ${escapeHtml(displayDate(form.data_notificacao))}</div>
          <div>${escapeHtml(form.numero_oficio || "001/2026")}</div>
        </div>
      </header>
      <p><strong>CNPJ/MF SOB O N.º ${escapeHtml(empresa?.cnpj || "00.000.000/0000-00")}</strong> expõe e notifica acerca do quanto segue.</p>
      <p><strong>1.</strong> A DETENTORA identificou ocupação irregular em sua infraestrutura de distribuição de energia elétrica por cabos, fios, cordoalha e equipamentos de telecomunicações da OCUPANTE.</p>
      <p><strong>2.</strong> A regularização deverá ocorrer no prazo de <strong>${escapeHtml(form.prazo_dias || "10 (dez) dias")}</strong>, conforme normas técnicas e regulamentares aplicáveis.</p>
      <table style="width:100%;border-collapse:collapse;margin:18px 0;">
        <thead><tr><th style="border:1px solid #111;padding:8px;background:#f3f3f3;">Endereço</th><th style="border:1px solid #111;padding:8px;background:#f3f3f3;">Cidade</th><th style="border:1px solid #111;padding:8px;background:#f3f3f3;">Contrato</th></tr></thead>
        <tbody><tr><td style="border:1px solid #111;padding:8px;">${escapeHtml(endereco)}</td><td style="border:1px solid #111;padding:8px;">${escapeHtml(`${cidade}${estado ? ` - ${estado}` : ""}`)}</td><td style="border:1px solid #111;padding:8px;">${escapeHtml(contrato)}</td></tr></tbody>
      </table>
      <p><strong>3.</strong> Nos termos da Resolução Conjunta ANEEL/ANATEL e do contrato, cabe à OCUPANTE regularizar e manter regular as ocupações dos cabos, fios e equipamentos sob sua responsabilidade.</p>
      <p style="color:#a40000;font-weight:700;margin-top:20px;">RES 04</p>
      <p><strong>Art. 4º</strong> No compartilhamento de postes, as prestadoras devem seguir o plano de ocupação de infraestrutura da distribuidora e as normas técnicas aplicáveis.</p>
      <div style="margin-top:42px;text-align:center;">
        <strong>${escapeHtml(nome)}</strong><br />
        CNPJ: ${escapeHtml(empresa?.cnpj || "")} | Contrato: ${escapeHtml(contrato)}
      </div>
    </article>
  `;
}

type WizardForm = {
  tipo_notificacao: string;
  numero_oficio: string;
  data_notificacao: string;
  prazo_dias: string;
  endereco_notificacao: string;
  lote_nome: string;
};

export function GerarNotificacaoWizard({ empresas, tipos, canEdit, action }: Props) {
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<WizardForm>({
    tipo_notificacao: tipos[0] || "",
    numero_oficio: "",
    data_notificacao: todayInput(),
    prazo_dias: "10 (dez) dias",
    endereco_notificacao: "",
    lote_nome: ""
  });

  const selectedEmpresas = useMemo(
    () => empresas.filter((empresa) => selectedIds.includes(empresa.id)),
    [empresas, selectedIds]
  );
  const firstEmpresa = selectedEmpresas[0];
  const previewHtml = useMemo(() => buildPreviewHtml(firstEmpresa, form), [firstEmpresa, form]);
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

  function resetForm() {
    setForm({
      tipo_notificacao: tipos[0] || "",
      numero_oficio: "",
      data_notificacao: todayInput(),
      prazo_dias: "10 (dez) dias",
      endereco_notificacao: "",
      lote_nome: ""
    });
  }

  function addEndereco() {
    const endereco = firstEmpresa?.endereco;
    if (!endereco) return;
    updateForm(
      "endereco_notificacao",
      form.endereco_notificacao ? `${form.endereco_notificacao}\n${endereco}` : endereco
    );
  }

  function openPreview(print = false) {
    const preview = window.open("", "_blank", "noopener,noreferrer,width=900,height=900");
    if (!preview) return;
    preview.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><title>Prévia da Notificação</title></head><body style="margin:0;background:#dbe3ec;">${previewHtml}</body></html>`);
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
            <h1 className="text-4xl font-extrabold leading-tight text-slate-950">Gerar Notificação</h1>
            <p className="mt-1 text-base text-slate-600">Selecione o tipo, empresas e visualize antes de gerar</p>
          </div>
        </div>

        <div className="mx-auto mt-9 flex max-w-xl items-center justify-center">
          {steps.map((item, index) => {
            const active = item.id <= step;
            return (
              <div key={item.id} className="flex items-start">
                <button
                  type="button"
                  onClick={() => setStep(item.id)}
                  className="flex flex-col items-center gap-2 text-sm font-semibold"
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      active ? "bg-violet-600 text-white shadow-lg shadow-violet-200" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {item.id}
                  </span>
                  <span className={active ? "text-violet-700" : "text-slate-500"}>{item.label}</span>
                </button>
                {index < steps.length - 1 ? (
                  <div className={`mx-2 mt-5 h-1 w-16 ${index + 1 < step ? "bg-violet-600" : "bg-slate-200"}`} />
                ) : null}
              </div>
            );
          })}
        </div>
      </header>

      {!canEdit ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {EDIT_RESTRICTED_MESSAGE}
        </div>
      ) : null}

      <form action={submit} className="wizard-panel overflow-hidden">
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="empresa_ids" value={id} />
        ))}
        {Object.entries(form).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}

        {step === 1 ? (
          <WizardSection title="1. Selecione o Tipo de Notificação" subtitle="Escolha qual tipo de documento deseja gerar">
            <select
              className="field h-14 text-base"
              value={form.tipo_notificacao}
              onChange={(event) => updateForm("tipo_notificacao", event.target.value)}
            >
              <option value="">Selecione o tipo de notificação</option>
              {tipos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </WizardSection>
        ) : null}

        {step === 2 ? (
          <WizardSection title="2. Selecione as Empresas" subtitle="Escolha quais empresas receberão a notificação">
            <div className="flex flex-col gap-3 md:flex-row">
              <label className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  className="field h-12 pl-12"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por empresa, CNPJ, contrato ou cidade..."
                />
              </label>
              <button type="button" className="btn-secondary h-12 px-5" onClick={selectAllFiltered}>
                Selecionar Todas
              </button>
            </div>

            <div className="rounded-md bg-slate-50 px-4 py-4 font-semibold text-slate-700">
              {selectedIds.length} empresa(s) selecionada(s)
            </div>

            <div className="max-h-80 overflow-auto rounded-md border border-line bg-white">
              {filteredEmpresas.map((empresa) => (
                <label key={empresa.id} className="flex cursor-pointer gap-3 border-b border-line px-4 py-4 last:border-b-0 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                    checked={selectedIds.includes(empresa.id)}
                    onChange={() => toggleEmpresa(empresa.id)}
                  />
                  <span>
                    <span className="block font-bold text-slate-800">{empresa.nome}</span>
                    <span className="block text-sm text-slate-600">
                      CNPJ: {empresa.cnpj || "-"} | Contrato: {empresa.contrato_numero || "-"}
                    </span>
                    <span className="block text-xs uppercase text-slate-500">
                      {empresa.cidade || "-"}{empresa.estado ? ` - ${empresa.estado}` : ""}
                    </span>
                  </span>
                </label>
              ))}
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
            <div className="grid gap-5 bg-blue-50/80 p-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xl font-extrabold text-slate-950">
                  <Edit3 className="text-blue-600" size={22} />
                  Editar Informações dos Documentos
                </div>
                <p className="text-sm text-slate-600">As informações preenchidas serão aplicadas a TODOS os PDF(s).</p>

                <label className="block">
                  <span className="text-sm font-bold text-blue-900">Número da Regularização *</span>
                  <input
                    className="field mt-2"
                    value={form.numero_oficio}
                    onChange={(event) => updateForm("numero_oficio", event.target.value)}
                    placeholder="Ex: 001/2025"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-blue-900">Data da Notificação *</span>
                  <input
                    className="field mt-2"
                    type="date"
                    value={form.data_notificacao}
                    onChange={(event) => updateForm("data_notificacao", event.target.value)}
                  />
                  <span className="mt-2 block text-xs text-blue-700">Formato: São José dos Campos, {displayDate(form.data_notificacao)}</span>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-blue-900">Prazo para Regularização *</span>
                  <select
                    className="field mt-2"
                    value={form.prazo_dias}
                    onChange={(event) => updateForm("prazo_dias", event.target.value)}
                  >
                    <option>10 (dez) dias</option>
                    <option>15 (quinze) dias</option>
                    <option>30 (trinta) dias</option>
                    <option>60 (sessenta) dias</option>
                  </select>
                  <span className="mt-2 block text-xs text-blue-700">Este prazo aparecerá no texto da notificação.</span>
                </label>

                <div className="border-t border-blue-200 pt-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold text-blue-950">Endereços Irregulares</h3>
                      <p className="text-xs text-blue-700">Adicione um endereço por linha ou use o endereço da empresa.</p>
                    </div>
                    <button type="button" className="btn bg-emerald-600 text-white hover:bg-emerald-700" onClick={addEndereco}>
                      <Plus size={16} />
                      Adicionar Endereço
                    </button>
                  </div>
                  <textarea
                    className="field min-h-28"
                    value={form.endereco_notificacao}
                    onChange={(event) => updateForm("endereco_notificacao", event.target.value)}
                    placeholder={firstEmpresa?.endereco || "Endereço, bairro, cidade"}
                  />
                </div>
              </div>

              <PreviewCard
                empresa={firstEmpresa}
                previewHtml={previewHtml}
                onPrint={() => openPreview(true)}
                onView={() => openPreview(false)}
              />
            </div>
          </WizardSection>
        ) : null}

        {step === 4 ? (
          <WizardSection title="4. Quantidade" subtitle="Confira o lote antes de salvar as notificações">
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard label="Tipo" value={form.tipo_notificacao || "-"} />
              <SummaryCard label="Empresas" value={`${selectedIds.length} selecionada(s)`} />
              <SummaryCard label="Prazo" value={form.prazo_dias || "-"} />
            </div>
            <label className="mt-5 block">
              <span className="label">Nome do lote</span>
              <input
                className="field mt-1"
                value={form.lote_nome}
                onChange={(event) => updateForm("lote_nome", event.target.value)}
                placeholder={`${selectedIds.length} notificação(ões) - ${displayDate(form.data_notificacao)}`}
              />
            </label>
            <div className="mt-5 rounded-md border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-900">
              Ao salvar, o sistema criará uma notificação para cada empresa selecionada, com HTML e URL de PDF gerados automaticamente.
            </div>
          </WizardSection>
        ) : null}

        <footer className="flex items-center justify-between border-t border-line bg-white px-6 py-5">
          <div className="flex gap-3">
            <button type="button" className="btn-secondary min-w-24" disabled={step === 1} onClick={() => setStep((current) => Math.max(current - 1, 1))}>
              Voltar
            </button>
            <Link href="/notificacoes" className="btn text-red-600 hover:bg-red-50">
              Cancelar
            </Link>
          </div>
          {step < 4 ? (
            <button type="button" className="btn bg-violet-500 px-8 text-white hover:bg-violet-600" disabled={nextDisabled} onClick={goNext}>
              Continuar para {steps[step]?.label}
            </button>
          ) : (
            <button className="btn bg-blue-500 px-8 text-white hover:bg-blue-600" disabled={!canEdit || isPending || selectedIds.length === 0}>
              <Save size={16} />
              {isPending ? "Salvando..." : `Salvar ${selectedIds.length} Notificação(ões)`}
            </button>
          )}
        </footer>
      </form>
    </div>
  );
}

function WizardSection({
  title,
  subtitle,
  aside,
  children
}: {
  title: string;
  subtitle: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-4 bg-violet-50/60 px-6 py-7">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950">{title}</h2>
          <p className="mt-2 text-slate-600">{subtitle}</p>
        </div>
        {aside}
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </>
  );
}

function PreviewCard({
  empresa,
  previewHtml,
  onPrint,
  onView
}: {
  empresa?: EmpresaOption;
  previewHtml: string;
  onPrint: () => void;
  onView: () => void;
}) {
  return (
    <div className="rounded-md border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-slate-50 px-4 py-4">
        <div className="flex gap-3">
          <FileText className="mt-1 text-violet-600" size={20} />
          <div>
            <h3 className="font-extrabold text-slate-950">PDF 1 - {empresa?.nome || "Empresa selecionada"}</h3>
            <p className="text-sm text-slate-600">
              CNPJ: {empresa?.cnpj || "-"} | Contrato: {empresa?.contrato_numero || "-"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={onPrint}>
            <Printer size={16} />
            Imprimir
          </button>
          <button type="button" className="btn-secondary" onClick={onView}>
            <ExternalLink size={16} />
            Visualizar
          </button>
        </div>
      </div>
      <div className="h-[400px] overflow-auto bg-slate-300 px-8 py-4">
        <div className="origin-top scale-[0.58]" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
        <Box size={14} />
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2 text-base font-extrabold text-slate-900">
        <Check size={16} className="text-emerald-600" />
        {value}
      </div>
    </div>
  );
}
