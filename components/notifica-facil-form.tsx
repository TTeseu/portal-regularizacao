"use client";

import type { NotificaFacilNotification } from "@prisma/client";
import { Calculator, CheckCircle2, FileText, Save, Search } from "lucide-react";
import { useMemo, useState } from "react";

const STATUS_OPTIONS = [
  "Aguardando assinatura Gestor",
  "Notificacao Encaminhada por E-mail.",
  "Resposta do Cliente - Anexo do E-mail.",
  "Entrega do Projeto ou Projeto Pendente. (10 dias)",
  "Nao houve resposta do Cliente - Valores Informar o Faturamento.",
  "Finalizar Notificacao."
];

export type NotificaFacilCompanyOption = {
  id: string;
  empresa: string;
  status_envio_notificacao: string | null;
  vencimento_contrato: string | null;
  ano_vencimento_contrato: string | null;
  empresa_endereco: string | null;
  empresa_bairro: string | null;
  empresa_cidade: string | null;
  empresa_estado: string | null;
  contrato_numero: string | null;
  ac: string | null;
  numero_nome_empresa: string | null;
  celebrado_em: string | null;
  numero_parceiro: string | null;
  cnpj: string | null;
  texto_contrato_7_14: string | null;
  texto_ocupacao_revelia: string | null;
  texto_23_3: string | null;
  texto_24_1: string | null;
  texto_24_3: string | null;
  valor_atualizado: string | null;
  multa: string | null;
  retroativo: string | null;
};

type FormValues = {
  empresa: string;
  status: string;
  status_envio_notificacao: string;
  tipo_servico: string;
  numero_protocolo: string;
  numero_notificacao: string;
  numero_registro_censo: string;
  ordem_venda: string;
  destinatario_nome: string;
  destinatario_cpf: string;
  destinatario_endereco: string;
  data_notificacao: string;
  prazo_resposta: string;
  data_email_encaminhado: string;
  cnpj: string;
  contrato_numero: string;
  ac: string;
  numero_nome_empresa: string;
  numero_parceiro: string;
  celebrado_em: string;
  vencimento_contrato: string;
  ano_vencimento_contrato: string;
  empresa_endereco: string;
  empresa_bairro: string;
  empresa_cidade: string;
  empresa_estado: string;
  empresa_incorporada: string;
  texto_contrato_7_14: string;
  texto_ocupacao_revelia: string;
  texto_23_3: string;
  texto_24_1: string;
  texto_24_3: string;
  valor_atualizado: string;
  multa: string;
  retroativo: string;
  enderecos_revelia: string;
  anexos_resposta_email: string;
  observacoes: string;
  pt_data_notificado: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(isoDate: string, days: number) {
  const date = parseDate(isoDate) || new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const clean = value.trim();
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const brMatch = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const date = new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(clean);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function normalizeDateForInput(value: string | null | undefined) {
  const parsed = parseDate(value);
  return parsed ? parsed.toISOString().slice(0, 10) : "";
}

function yearFromDate(value: string) {
  const parsed = parseDate(value);
  return parsed ? String(parsed.getFullYear()) : String(new Date().getFullYear());
}

function nextNumberForYear(nextByYear: Record<string, number>, year: string) {
  const next = nextByYear[year] || 1;
  return `REG${String(next).padStart(4, "0")}/${year}`;
}

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

function parseMoney(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
    .trim();
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function plainMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function escapeHtml(value?: string | number | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function textBlock(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function longDate(value: string) {
  const parsed = parseDate(value);
  if (!parsed) return escapeHtml(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(parsed);
}

function previewAddressRows(values: FormValues) {
  const rows = values.enderecos_revelia
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [endereco = "", bairro = "", cidade = ""] = line.split(";").map((part) => part.trim());
      return { endereco, bairro, cidade };
    });
  const normalized = rows.length ? rows : [{
    endereco: "",
    bairro: "",
    cidade: ""
  }];
  return normalized
    .map((row) => `                <tr>
                  <td>${escapeHtml(row.endereco)}</td>
                  <td>${escapeHtml(row.bairro)}</td>
                  <td>${escapeHtml(row.cidade)}</td>
                </tr>`)
    .join("\n");
}

function replaceAddressTable(template: string, rows: string) {
  return template.replace(
    /\s*<tr>\s*<td>\{\{ENDERECO_A_REVELIA\}\}<\/td>\s*<td>\{\{BAIRRO_A_REVELIA\}\}<\/td>\s*<td>\{\{MUNICIPIO_A_REVELIA\}\}<\/td>\s*<\/tr>/,
    `\n${rows}`
  );
}

function buildPreviewHtml(templateHtml: string, values: FormValues, previewNumber: string, mostrarCelebradoEm: boolean, valorMulta: number) {
  let html = templateHtml || "<html><body><p>Template nao encontrado.</p></body></html>";
  if (!mostrarCelebradoEm) html = html.replace(/, celebrado em \{\{CELEBRADO_EM\}\},/g, ",");
  html = replaceAddressTable(html, previewAddressRows(values));
  const replacements: Record<string, string> = {
    "{{DATA_NOTIFICACAO}}": longDate(values.data_notificacao),
    "{{NUMERO_DA_NOTIFICACAO}}": escapeHtml(previewNumber || "-"),
    "{{NOME_DA_EMPRESA}}": escapeHtml(values.empresa || "-"),
    "{{ENDERECO_DA_EMPRESA}}": escapeHtml(values.empresa_endereco || "-"),
    "{{BAIRRO_DA_EMPRESA}}": escapeHtml(values.empresa_bairro || "-"),
    "{{CIDADE_DA_EMPRESA}}": escapeHtml(values.empresa_cidade || "-"),
    "{{ESTADO_DA_EMPRESA}}": escapeHtml(values.empresa_estado || "-"),
    "{{NUMERO_CONTRATO}}": escapeHtml(values.contrato_numero || "-"),
    "{{A_C}}": escapeHtml(values.ac || "-"),
    "{{CELEBRADO_EM}}": escapeHtml(values.celebrado_em || "-"),
    "{{CNPJ_DA_EMPRESA}}": escapeHtml(values.cnpj || "-"),
    "{{TEXTO_CONTRATO_7_14}}": textBlock(values.texto_contrato_7_14),
    "{{TEXTO_OCUPACAO_REVELIA}}": textBlock(values.texto_ocupacao_revelia),
    "{{TEXTO_23_3}}": textBlock(values.texto_23_3),
    "{{TEXTO_24_1}}": textBlock(values.texto_24_1),
    "{{TEXTO_24_3}}": textBlock(values.texto_24_3),
    "{{VALOR_MULTA}}": plainMoney(valorMulta),
    "{{VALOR_RETROATIVO_CALCULADO}}": escapeHtml(values.retroativo || "0,00")
  };
  for (const [placeholder, value] of Object.entries(replacements)) html = html.replaceAll(placeholder, value);
  return html;
}

function isContractExpired(value: string, year: string) {
  const parsed = parseDate(value);
  if (parsed) return parsed.getTime() < new Date().setHours(0, 0, 0, 0);
  const parsedYear = Number(year);
  return Number.isFinite(parsedYear) && parsedYear < new Date().getFullYear();
}

function initialValues(notification?: NotificaFacilNotification | null, nextNumero?: string): FormValues {
  const date = normalizeDateForInput(notification?.data_notificacao) || todayIso();
  return {
    empresa: notification?.empresa || "",
    status: notification?.status || STATUS_OPTIONS[0],
    status_envio_notificacao: notification?.status_envio_notificacao || "",
    tipo_servico: notification?.tipo_servico || "",
    numero_protocolo: notification?.numero_protocolo || "",
    numero_notificacao: notification?.numero_notificacao || nextNumero || "",
    numero_registro_censo: notification?.numero_registro_censo || "",
    ordem_venda: notification?.ordem_venda || "",
    destinatario_nome: notification?.destinatario_nome || "",
    destinatario_cpf: notification?.destinatario_cpf || "",
    destinatario_endereco: notification?.destinatario_endereco || "",
    data_notificacao: date,
    prazo_resposta: normalizeDateForInput(notification?.prazo_resposta) || addDaysIso(date, 10),
    data_email_encaminhado: normalizeDateForInput(notification?.data_email_encaminhado),
    cnpj: notification?.cnpj || "",
    contrato_numero: notification?.contrato_numero || "",
    ac: notification?.ac || "",
    numero_nome_empresa: notification?.numero_nome_empresa || "",
    numero_parceiro: notification?.numero_parceiro || "",
    celebrado_em: notification?.celebrado_em || "",
    vencimento_contrato: notification?.vencimento_contrato || "",
    ano_vencimento_contrato: notification?.ano_vencimento_contrato || "",
    empresa_endereco: notification?.empresa_endereco || "",
    empresa_bairro: notification?.empresa_bairro || "",
    empresa_cidade: notification?.empresa_cidade || "",
    empresa_estado: notification?.empresa_estado || "",
    empresa_incorporada: notification?.empresa_incorporada || "",
    texto_contrato_7_14: notification?.texto_contrato_7_14 || "",
    texto_ocupacao_revelia: notification?.texto_ocupacao_revelia || "",
    texto_23_3: notification?.texto_23_3 || "",
    texto_24_1: notification?.texto_24_1 || "",
    texto_24_3: notification?.texto_24_3 || "",
    valor_atualizado: notification?.valor_atualizado?.toString() || "",
    multa: notification?.multa?.toString() || "",
    retroativo: notification?.retroativo || "",
    enderecos_revelia: jsonLines(notification?.enderecos_revelia, ["endereco", "bairro", "cidade"]),
    anexos_resposta_email: jsonLines(notification?.anexos_resposta_email, ["nome", "url"]),
    observacoes: notification?.observacoes || "",
    pt_data_notificado: normalizeDateForInput(notification?.pt_data_notificado)
  };
}

export function NotificaFacilForm({
  notification,
  action,
  canEdit = true,
  companyOptions = [],
  nextNumero = "",
  nextByYear = {},
  templateHtml = ""
}: {
  notification?: NotificaFacilNotification | null;
  action: (formData: FormData) => void | Promise<void>;
  canEdit?: boolean;
  companyOptions?: NotificaFacilCompanyOption[];
  nextNumero?: string;
  nextByYear?: Record<string, number>;
  templateHtml?: string;
}) {
  const [values, setValues] = useState(() => initialValues(notification, nextNumero));
  const [companyQuery, setCompanyQuery] = useState(notification?.empresa || "");
  const [showCompanyResults, setShowCompanyResults] = useState(false);
  const [prazoTouched, setPrazoTouched] = useState(Boolean(notification?.prazo_resposta));
  const [mostrarCelebradoEm, setMostrarCelebradoEm] = useState(notification?.mostrar_celebrado_em ?? true);
  const isEditing = Boolean(notification);
  const currentYear = yearFromDate(values.data_notificacao);
  const previewNumber = isEditing
    ? values.numero_notificacao
    : nextNumberForYear(nextByYear, currentYear);

  const filteredCompanies = useMemo(() => {
    const query = companyQuery.trim().toLowerCase();
    const list = query
      ? companyOptions.filter((item) =>
          [
            item.empresa,
            item.cnpj,
            item.contrato_numero,
            item.empresa_cidade,
            item.numero_parceiro
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
      : companyOptions;
    return list.slice(0, 30);
  }, [companyOptions, companyQuery]);

  const totalIds = values.enderecos_revelia.split(/\r?\n/).filter((line) => line.trim()).length;
  const valorPonto = parseMoney(values.valor_atualizado);
  const multa = parseMoney(values.multa);
  const retroativo = parseMoney(values.retroativo);
  const resultado = valorPonto * totalIds;
  const valorMulta = resultado + multa + retroativo;
  const contractExpired = isContractExpired(values.vencimento_contrato, values.ano_vencimento_contrato);
  const previewHtml = useMemo(
    () => buildPreviewHtml(templateHtml, values, previewNumber, mostrarCelebradoEm, valorMulta),
    [templateHtml, values, previewNumber, mostrarCelebradoEm, valorMulta]
  );

  function setField(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleDateChange(value: string) {
    setValues((current) => ({
      ...current,
      data_notificacao: value,
      numero_notificacao: isEditing ? current.numero_notificacao : nextNumberForYear(nextByYear, yearFromDate(value)),
      prazo_resposta: prazoTouched ? current.prazo_resposta : addDaysIso(value, 10)
    }));
  }

  function selectCompany(company: NotificaFacilCompanyOption) {
    setCompanyQuery(company.empresa);
    setShowCompanyResults(false);
    setValues((current) => ({
      ...current,
      empresa: company.empresa || "",
      destinatario_nome: current.destinatario_nome || company.empresa || "",
      status_envio_notificacao: company.status_envio_notificacao || "",
      vencimento_contrato: company.vencimento_contrato || "",
      ano_vencimento_contrato: company.ano_vencimento_contrato || "",
      empresa_endereco: company.empresa_endereco || "",
      empresa_bairro: company.empresa_bairro || "",
      empresa_cidade: company.empresa_cidade || "",
      empresa_estado: company.empresa_estado || "",
      contrato_numero: company.contrato_numero || "",
      ac: company.ac || "",
      numero_nome_empresa: company.numero_nome_empresa || "",
      celebrado_em: company.celebrado_em || "",
      numero_parceiro: company.numero_parceiro || "",
      cnpj: company.cnpj || "",
      texto_contrato_7_14: company.texto_contrato_7_14 || "",
      texto_ocupacao_revelia: company.texto_ocupacao_revelia || "",
      texto_23_3: company.texto_23_3 || "",
      texto_24_1: company.texto_24_1 || "",
      texto_24_3: company.texto_24_3 || "",
      valor_atualizado: company.valor_atualizado || "",
      multa: company.multa || "",
      retroativo: company.retroativo || ""
    }));
  }

  return (
    <form action={action} className="panel overflow-hidden">
      <input type="hidden" name="numero_notificacao" value={previewNumber} />
      <input type="hidden" name="valor_cobrado" value={valorMulta ? valorMulta.toFixed(2) : ""} />
      <input type="hidden" name="total_ids_identificados" value={totalIds} />

      <div className="border-b border-line bg-surface px-6 py-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h2 className="text-xl font-bold text-white">Nova Notificacao</h2>
            <p className="mt-1 text-sm text-edp-muted">Fluxo do Notifica Facil com base CSV, dados contratuais e calculo antes da geracao do PDF.</p>
          </div>
          <div className="rounded-2xl border border-edp/30 bg-edp/10 px-4 py-3 text-sm">
            <span className="block text-xs font-bold uppercase text-edp-muted">Numero automatico</span>
            <strong className="text-lg text-edp">{previewNumber || "A gerar"}</strong>
          </div>
        </div>
      </div>

      <fieldset disabled={!canEdit} className="space-y-7 p-6 disabled:opacity-60">
        {!isEditing ? (
          <Section title="Selecionar empresa" description="Use a base do Notifica Facil importada do Base44 para preencher automaticamente os dados.">
            <div className="relative">
              <span className="label">Selecionar Empresa (Banco de Dados CSV)</span>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-edp-muted" size={18} />
                <input
                  className="field h-12 pl-11"
                  value={companyQuery}
                  onChange={(event) => {
                    setCompanyQuery(event.target.value);
                    setShowCompanyResults(true);
                  }}
                  onFocus={() => setShowCompanyResults(true)}
                  placeholder="Buscar por empresa, CNPJ, contrato, parceiro ou cidade..."
                />
              </div>
              {showCompanyResults ? (
                <div className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-2xl border border-line bg-[#1E2D44] shadow-2xl shadow-black/30">
                  {filteredCompanies.length ? (
                    filteredCompanies.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        className="block w-full border-b border-line px-4 py-3 text-left text-white transition last:border-0 hover:bg-edp/10"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectCompany(company)}
                      >
                        <span className="block font-bold">{company.empresa}</span>
                        <span className="mt-1 block text-xs text-edp-muted">
                          CNPJ: {company.cnpj || "-"} | Contrato: {company.contrato_numero || "-"} | {company.empresa_cidade || "-"} {company.empresa_estado ? `- ${company.empresa_estado}` : ""}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-5 text-sm text-edp-muted">Nenhuma empresa encontrada na base do Notifica Facil.</div>
                  )}
                </div>
              ) : null}
            </div>
          </Section>
        ) : null}

        <Section title="Previa da Notificacao" description="A previa aparece desde o inicio e acompanha os campos preenchidos antes de gerar o PDF.">
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <iframe className="h-[760px] w-full bg-white" sandbox="" srcDoc={previewHtml} title="Previa da notificacao Notifica Facil" />
          </div>
        </Section>

        <Section title="Dados da notificacao" description="Datas e identificadores principais do fluxo documental.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Numero da notificacao">
              <input className="field mt-2 cursor-not-allowed bg-white/[0.04] text-edp" value={previewNumber} disabled />
            </Field>
            <Input label="Data da Notificacao" name="data_notificacao" type="date" value={values.data_notificacao} onChange={handleDateChange} required />
            <Input
              label="Prazo para Resposta"
              name="prazo_resposta"
              type="date"
              value={values.prazo_resposta}
              onChange={(value) => {
                setPrazoTouched(true);
                setField("prazo_resposta", value);
              }}
            />
            <Input label="Data E-mail Encaminhado" name="data_email_encaminhado" type="date" value={values.data_email_encaminhado} onChange={(value) => setField("data_email_encaminhado", value)} />
            <Field label="Status">
              <select className="field mt-2" name="status" value={values.status} onChange={(event) => setField("status", event.target.value)}>
                {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
              </select>
            </Field>
            <Input label="Tipo de servico" name="tipo_servico" value={values.tipo_servico} onChange={(value) => setField("tipo_servico", value)} />
            <Input label="Numero protocolo" name="numero_protocolo" value={values.numero_protocolo} onChange={(value) => setField("numero_protocolo", value)} />
            <Input label="Registro censo" name="numero_registro_censo" value={values.numero_registro_censo} onChange={(value) => setField("numero_registro_censo", value)} />
            <Input label="Ordem de venda" name="ordem_venda" value={values.ordem_venda} onChange={(value) => setField("ordem_venda", value)} />
            <Input label="Status para envio" name="status_envio_notificacao" value={values.status_envio_notificacao} onChange={(value) => setField("status_envio_notificacao", value)} />
            <Input label="PT data notificado" name="pt_data_notificado" type="date" value={values.pt_data_notificado} onChange={(value) => setField("pt_data_notificado", value)} />
          </div>
        </Section>

        <Section title="Dados da empresa e contrato" description="Campos preenchidos automaticamente pela base CSV e editaveis antes de salvar.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input className="xl:col-span-2" label="Nome da Empresa" name="empresa" value={values.empresa} onChange={(value) => setField("empresa", value)} required />
            <Input label="CNPJ" name="cnpj" value={values.cnpj} onChange={(value) => setField("cnpj", value)} />
            <Input label="Contrato No." name="contrato_numero" value={values.contrato_numero} onChange={(value) => setField("contrato_numero", value)} />
            <Input label="A/C" name="ac" value={values.ac} onChange={(value) => setField("ac", value)} />
            <Input label="Numero/Nome da Empresa" name="numero_nome_empresa" value={values.numero_nome_empresa} onChange={(value) => setField("numero_nome_empresa", value)} />
            <Input label="No. Parceiro" name="numero_parceiro" value={values.numero_parceiro} onChange={(value) => setField("numero_parceiro", value)} />
            <Input label="Celebrado Em" name="celebrado_em" value={values.celebrado_em} onChange={(value) => setField("celebrado_em", value)} />
            <Input label="Vencimento do Contrato" name="vencimento_contrato" value={values.vencimento_contrato} onChange={(value) => setField("vencimento_contrato", value)} />
            <Input label="Ano vencimento" name="ano_vencimento_contrato" value={values.ano_vencimento_contrato} onChange={(value) => setField("ano_vencimento_contrato", value)} />
            <Input className="xl:col-span-2" label="Endereco" name="empresa_endereco" value={values.empresa_endereco} onChange={(value) => setField("empresa_endereco", value)} />
            <Input label="Bairro" name="empresa_bairro" value={values.empresa_bairro} onChange={(value) => setField("empresa_bairro", value)} />
            <Input label="Cidade" name="empresa_cidade" value={values.empresa_cidade} onChange={(value) => setField("empresa_cidade", value)} />
            <Input label="Estado" name="empresa_estado" value={values.empresa_estado} onChange={(value) => setField("empresa_estado", value)} />
            <Input label="Empresa incorporada" name="empresa_incorporada" value={values.empresa_incorporada} onChange={(value) => setField("empresa_incorporada", value)} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-white">
              <input
                type="checkbox"
                name="mostrar_celebrado_em"
                checked={mostrarCelebradoEm}
                onChange={(event) => setMostrarCelebradoEm(event.target.checked)}
              />
              Mostrar &quot;Celebrado em&quot; no PDF
            </label>
            {contractExpired ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/15 px-4 py-2 text-sm font-bold text-red-200">
                Contrato Vencido
              </span>
            ) : null}
          </div>
        </Section>

        <Section title="Destinatario e dados de contato">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input label="Destinatario nome" name="destinatario_nome" value={values.destinatario_nome} onChange={(value) => setField("destinatario_nome", value)} />
            <Input label="Destinatario CPF" name="destinatario_cpf" value={values.destinatario_cpf} onChange={(value) => setField("destinatario_cpf", value)} />
            <Input className="xl:col-span-2" label="Destinatario endereco" name="destinatario_endereco" value={values.destinatario_endereco} onChange={(value) => setField("destinatario_endereco", value)} />
          </div>
        </Section>

        <Section title="Campos contratuais completos" description="Textos utilizados na composicao do HTML/PDF do Notifica Facil.">
          <div className="grid gap-4 md:grid-cols-2">
            <Textarea label="Texto Contrato 7.14" name="texto_contrato_7_14" value={values.texto_contrato_7_14} onChange={(value) => setField("texto_contrato_7_14", value)} />
            <Textarea label="Texto Ocupacao Revelia" name="texto_ocupacao_revelia" value={values.texto_ocupacao_revelia} onChange={(value) => setField("texto_ocupacao_revelia", value)} />
            <Textarea label="Texto 23.3" name="texto_23_3" value={values.texto_23_3} onChange={(value) => setField("texto_23_3", value)} />
            <Textarea label="Texto 24.1" name="texto_24_1" value={values.texto_24_1} onChange={(value) => setField("texto_24_1", value)} />
            <Textarea className="md:col-span-2" label="Texto 24.3" name="texto_24_3" value={values.texto_24_3} onChange={(value) => setField("texto_24_3", value)} />
          </div>
        </Section>

        <Section title="Enderecos, valores e calculo" description="Informe um endereco por linha no formato Endereco; Bairro; Cidade.">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Textarea
              label="Enderecos revelia"
              name="enderecos_revelia"
              value={values.enderecos_revelia}
              onChange={(value) => setField("enderecos_revelia", value)}
              placeholder="Endereco; Bairro; Cidade"
            />
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
              <Input label="Valor do Ponto" name="valor_atualizado" value={values.valor_atualizado} onChange={(value) => setField("valor_atualizado", value)} />
              <Input label="Multa" name="multa" value={values.multa} onChange={(value) => setField("multa", value)} />
              <Input label="Retroativo" name="retroativo" value={values.retroativo} onChange={(value) => setField("retroativo", value)} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <CalcCard label="Total de ID identificado" value={String(totalIds)} />
            <CalcCard label="Resultado" value={formatMoney(resultado)} />
            <CalcCard label="Multa Final" value={formatMoney(multa)} />
            <CalcCard label="Valor da Multa" value={formatMoney(valorMulta)} accent />
          </div>
        </Section>

        <Section title="Anexos e observacoes">
          <div className="grid gap-4 md:grid-cols-2">
            <Textarea
              label="Anexos resposta email"
              name="anexos_resposta_email"
              value={values.anexos_resposta_email}
              onChange={(value) => setField("anexos_resposta_email", value)}
              placeholder="Nome; URL"
            />
            <Textarea label="Observacoes" name="observacoes" value={values.observacoes} onChange={(value) => setField("observacoes", value)} />
          </div>
        </Section>

        <Section title="Flags do fluxo">
          <div className="grid gap-3 md:grid-cols-4">
            <Checkbox name="is_draft" label="Rascunho" defaultChecked={notification?.is_draft || false} />
            <Checkbox name="is_standby" label="Stand-by" defaultChecked={notification?.is_standby || false} />
            <Checkbox name="pendencia_tecnica" label="Pendencia tecnica" defaultChecked={notification?.pendencia_tecnica || false} />
            <Checkbox name="pt_notificado" label="PT notificado" defaultChecked={notification?.pt_notificado || false} />
          </div>
        </Section>

        <div className="flex justify-end">
          <button className="btn-primary px-6" type="submit">
            <Save size={16} />
            Salvar e gerar PDF
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function Section({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card/50 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl border border-edp/25 bg-edp/10 p-2 text-edp">
          <FileText size={18} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {description ? <p className="mt-1 text-sm text-edp-muted">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  className = ""
}: {
  label: string;
  name: keyof FormValues;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <Field label={label} className={className}>
      <input
        className="field mt-2"
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      />
    </Field>
  );
}

function Textarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  className = ""
}: {
  label: string;
  name: keyof FormValues;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Field label={label} className={className}>
      <textarea
        className="field mt-2 min-h-36 resize-y leading-relaxed"
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function CalcCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-edp/40 bg-edp/10" : "border-line bg-surface/80"}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-edp-muted">
        {accent ? <CheckCircle2 size={14} className="text-edp" /> : <Calculator size={14} className="text-edp" />}
        {label}
      </div>
      <div className={`mt-2 text-xl font-extrabold ${accent ? "text-edp" : "text-white"}`}>{value}</div>
    </div>
  );
}

function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-white">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}
