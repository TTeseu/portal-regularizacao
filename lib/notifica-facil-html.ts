import type { NotificaFacilNotification } from "@prisma/client";

function esc(value?: string | number | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function money(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function dateText(value?: string | null) {
  if (!value) return "-";
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return value;
}

export function buildNotificaFacilHtml(notification: NotificaFacilNotification) {
  const enderecos = Array.isArray(notification.enderecos_revelia) ? notification.enderecos_revelia : [];
  const rows = enderecos.length
    ? enderecos
        .map((item) => {
          const row = item as { endereco?: string; bairro?: string; cidade?: string };
          return `<tr><td>${esc(row.endereco)}</td><td>${esc(row.bairro)}</td><td>${esc(row.cidade)}</td></tr>`;
        })
        .join("")
    : `<tr><td>${esc(notification.destinatario_endereco || notification.empresa_endereco)}</td><td>${esc(notification.empresa_bairro)}</td><td>${esc(notification.empresa_cidade)}</td></tr>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Notifica Facil - ${esc(notification.numero_notificacao || notification.empresa)}</title>
  <style>
    @page { size: A4; margin: 22mm 18mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 12px; line-height: 1.45; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #00a650; padding-bottom: 14px; margin-bottom: 24px; }
    .brand { font-size: 22px; font-weight: 800; color: #1E2D44; }
    .meta { text-align: right; font-size: 11px; color: #334155; }
    h1 { font-size: 18px; color: #1E2D44; margin: 0 0 18px; text-align: center; }
    h2 { font-size: 13px; color: #1E2D44; margin: 18px 0 8px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0 18px; }
    th, td { border: 1px solid #111827; padding: 7px; vertical-align: top; }
    th { background: #eef2f7; font-weight: 700; text-align: center; }
    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin: 12px 0; }
    .signature { margin-top: 58px; text-align: center; }
    .signature-line { width: 280px; border-top: 1px solid #111827; margin: 0 auto 6px; }
    .r1 { color: #fff; font-size: 1px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">EDP</div>
    <div class="meta">
      <strong>Notifica Facil</strong><br/>
      Notificacao: ${esc(notification.numero_notificacao || "-")}<br/>
      Registro censo: ${esc(notification.numero_registro_censo || "-")}
    </div>
  </div>

  <h1>NOTIFICACAO OPERACIONAL</h1>

  <p><strong>Empresa:</strong> ${esc(notification.empresa)}</p>
  <p><strong>CNPJ:</strong> ${esc(notification.cnpj || "-")} &nbsp; <strong>Contrato:</strong> ${esc(notification.contrato_numero || "-")}</p>
  ${notification.mostrar_celebrado_em && notification.celebrado_em ? `<p><strong>Celebrado em:</strong> ${esc(notification.celebrado_em)}</p>` : ""}
  <p><strong>Tipo de servico:</strong> ${esc(notification.tipo_servico || "-")} &nbsp; <strong>Protocolo:</strong> ${esc(notification.numero_protocolo || "-")}</p>
  <p><strong>Destinatario:</strong> ${esc(notification.destinatario_nome || notification.empresa)}</p>

  <div class="box">
    <strong>Status:</strong> ${esc(notification.status)}<br/>
    <strong>Status para envio:</strong> ${esc(notification.status_envio_notificacao || "-")}<br/>
    <strong>Data da notificacao:</strong> ${esc(dateText(notification.data_notificacao))}<br/>
    <strong>Prazo de resposta:</strong> ${esc(dateText(notification.prazo_resposta))}<br/>
    <strong>Data e-mail encaminhado:</strong> ${esc(dateText(notification.data_email_encaminhado))}<br/>
    <strong>Valor cobrado:</strong> ${money(notification.valor_cobrado)}
  </div>

  <h2>Enderecos / ativos identificados</h2>
  <table>
    <thead><tr><th>Endereco</th><th>Bairro</th><th>Cidade</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <h2>Fundamentacao contratual</h2>
  <p>${esc(notification.texto_contrato_7_14 || "Conforme contrato aplicavel, a ocupante devera regularizar as pendencias identificadas pela EDP.")}</p>
  <p>${esc(notification.texto_ocupacao_revelia || "")}</p>
  <p>${esc(notification.texto_23_3 || "")}</p>
  <p>${esc(notification.texto_24_1 || "")}</p>
  <p>${esc(notification.texto_24_3 || "")}</p>

  <h2>Resumo do calculo</h2>
  <div class="box">
    <strong>Total de IDs identificados:</strong> ${esc(notification.total_ids_identificados ?? "-")}<br/>
    <strong>Valor do ponto:</strong> ${money(notification.valor_atualizado)}<br/>
    <strong>Multa final:</strong> ${money(notification.multa)}<br/>
    <strong>Retroativo:</strong> ${esc(notification.retroativo || "-")}<br/>
    <strong>Valor da multa:</strong> ${money(notification.valor_cobrado)}
  </div>

  <h2>Observacoes</h2>
  <p>${esc(notification.observacoes || "Sem observacoes adicionais.")}</p>

  <div class="signature">
    <div class="r1">R1</div>
    <div class="signature-line"></div>
    <strong>Assinatura</strong>
  </div>
</body>
</html>`;
}
