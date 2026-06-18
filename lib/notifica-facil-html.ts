import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NotificaFacilNotification } from "@prisma/client";
import { formatCNPJDisplay } from "@/lib/cnpj";
import { EDP_LOGO_DATA_URI } from "@/lib/edp-logo";

let cachedTemplate: string | null = null;

function loadTemplate() {
  if (!cachedTemplate) {
    cachedTemplate = readFileSync(join(process.cwd(), "public", "templates", "notifica-facil-template.html"), "utf8");
  }
  return cachedTemplate;
}

function esc(value?: string | number | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function text(value?: string | number | null, fallback = "") {
  return esc(value ?? fallback);
}

function textBlock(value?: string | null) {
  return esc(value || "").replace(/\r?\n/g, "<br>");
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const clean = value.trim();
  const iso = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const br = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  const parsed = new Date(clean);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function longDate(value?: string | null) {
  const parsed = parseDate(value);
  if (!parsed) return text(value, "");
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(parsed);
}

function numberFromText(value?: string | number | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
    .trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function moneyNumber(value?: string | number | null) {
  const parsed = numberFromText(value);
  if (parsed === null) return text(value, "0,00");
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(parsed);
}

function addressRows(notification: NotificaFacilNotification) {
  const rows = Array.isArray(notification.enderecos_revelia) ? notification.enderecos_revelia : [];
  const normalized = rows
    .map((item) => {
      const row = item as { endereco?: string; bairro?: string; cidade?: string; municipio?: string };
      return {
        endereco: row.endereco || "",
        bairro: row.bairro || "",
        cidade: row.cidade || row.municipio || ""
      };
    })
    .filter((row) => row.endereco || row.bairro || row.cidade);

  const fallbackRows = normalized.length
    ? normalized
    : [{
        endereco: "",
        bairro: "",
        cidade: ""
      }];

  return fallbackRows
    .map((row) => `                <tr>
                  <td>${text(row.endereco)}</td>
                  <td>${text(row.bairro)}</td>
                  <td>${text(row.cidade)}</td>
                </tr>`)
    .join("\n");
}

function replaceAddressTable(template: string, rows: string) {
  return template.replace(
    /\s*<tr>\s*<td>\{\{ENDERECO_A_REVELIA\}\}<\/td>\s*<td>\{\{BAIRRO_A_REVELIA\}\}<\/td>\s*<td>\{\{MUNICIPIO_A_REVELIA\}\}<\/td>\s*<\/tr>/,
    `\n${rows}`
  );
}

export function sanitizeNotificaFacilHtml(html: string) {
  return html
    .replaceAll("https://captadores.org.br/wp-content/uploads/2024/08/edp.png", EDP_LOGO_DATA_URI)
    .replace(/<div class="assinatura-label">Assinatura<\/div>/gi, "");
}

export function buildNotificaFacilHtml(notification: NotificaFacilNotification) {
  let html = loadTemplate();
  html = html.replaceAll("https://captadores.org.br/wp-content/uploads/2024/08/edp.png", EDP_LOGO_DATA_URI);

  if (!notification.mostrar_celebrado_em) {
    html = html.replace(/, celebrado em \{\{CELEBRADO_EM\}\},/g, ",");
  }

  html = replaceAddressTable(html, addressRows(notification));

  const replacements: Record<string, string> = {
    "{{DATA_NOTIFICACAO}}": longDate(notification.data_notificacao),
    "{{NUMERO_DA_NOTIFICACAO}}": text(notification.numero_notificacao, "-"),
    "{{NOME_DA_EMPRESA}}": text(notification.empresa, "-"),
    "{{ENDERECO_DA_EMPRESA}}": text(notification.empresa_endereco, "-"),
    "{{BAIRRO_DA_EMPRESA}}": text(notification.empresa_bairro, "-"),
    "{{CIDADE_DA_EMPRESA}}": text(notification.empresa_cidade, "-"),
    "{{ESTADO_DA_EMPRESA}}": text(notification.empresa_estado, "-"),
    "{{NUMERO_CONTRATO}}": text(notification.contrato_numero, "-"),
    "{{A_C}}": text(notification.ac, "-"),
    "{{CELEBRADO_EM}}": text(notification.celebrado_em, "-"),
    "{{CNPJ_DA_EMPRESA}}": formatCNPJDisplay(notification.cnpj),
    "{{TEXTO_CONTRATO_7_14}}": textBlock(notification.texto_contrato_7_14),
    "{{TEXTO_OCUPACAO_REVELIA}}": textBlock(notification.texto_ocupacao_revelia),
    "{{TEXTO_23_3}}": textBlock(notification.texto_23_3),
    "{{TEXTO_24_1}}": textBlock(notification.texto_24_1),
    "{{TEXTO_24_3}}": textBlock(notification.texto_24_3),
    "{{VALOR_MULTA}}": moneyNumber(notification.valor_cobrado ?? notification.multa),
    "{{VALOR_RETROATIVO_CALCULADO}}": text(notification.retroativo || moneyNumber(0)),
    "{{R1_MARKER}}": '<span class="r1-marker" style="color:#fff;font-size:1px;line-height:0;">R1</span>'
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.replaceAll(placeholder, value);
  }

  return sanitizeNotificaFacilHtml(html);
}
