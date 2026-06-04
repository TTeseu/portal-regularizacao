import type { Notificacao } from "@prisma/client";

function escapeHtml(value?: string | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function rowsFromEndereco(notificacao: Notificacao) {
  const raw = notificacao.endereco_notificacao || notificacao.endereco || "";
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    return [{ endereco: notificacao.endereco || "", bairro: notificacao.bairro || "", cidade: notificacao.cidade || "" }];
  }
  return lines.map((line) => ({
    endereco: line,
    bairro: notificacao.bairro || "",
    cidade: notificacao.cidade || ""
  }));
}

export function buildNotificacaoHtml(notificacao: Notificacao) {
  if (notificacao.html_content) return notificacao.html_content;

  const empresa = notificacao.empresa || notificacao.empresa_1 || notificacao.empresa_rep || "EMPRESA";
  const endereco = notificacao.endereco || notificacao.rua_empresa_1 || notificacao.endereco_rep || "";
  const contrato = notificacao.contrato_numero || notificacao.numero_contrato_1 || "";
  const assunto =
    notificacao.tipo_notificacao ||
    "Ocupação Irregular - Descumprimento ao Contrato e às Normas Técnicas e Regulamentares Aplicáveis";
  const rows = rowsFromEndereco(notificacao);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Notificação ${escapeHtml(notificacao.numero_oficio)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; background: #dfe6ee; font-family: 'Noto Serif', 'Times New Roman', serif; color: #000; font-size: 10pt; }
    .page { width: 794px; margin: 20px auto; background: #fff; padding: 60px 80px; box-shadow: 0 4px 18px rgba(0,0,0,.15); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
    .logo { width: 70px; }
    .ref-block { text-align: right; font-weight: 700; }
    .dest { margin-bottom: 14px; line-height: 1.45; }
    .dest-nome, .assunto, .referencia, .atc, .prezado { font-weight: 700; }
    .assunto { text-transform: uppercase; margin-bottom: 8px; line-height: 1.35; }
    p { line-height: 1.4; text-align: justify; margin: 0 0 8px; }
    .sec-title { color: #b11919; font-weight: 700; margin: 10px 0 6px 28px; }
    .bloco-legal { margin-left: 28px; margin-bottom: 6px; }
    .inciso { margin-left: 46px; margin-bottom: 5px; text-align: justify; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 10px; font-size: 9.5pt; }
    th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
    th { background: #f3f3f3; text-align: center; }
    .assinatura-bloco { margin-top: 20px; text-align: center; break-inside: avoid; }
    .linha-assinatura { width: 280px; border-top: 1px solid #000; margin: 48px auto 4px; }
    @page { margin: 20mm 25mm; }
    @media print { body { background: #fff; } .page { margin: 0; width: auto; box-shadow: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <img class="logo" src="https://captadores.org.br/wp-content/uploads/2024/08/edp.png" alt="EDP" />
      <div class="ref-block">
        <div>São José dos Campos - SP, ${escapeHtml(notificacao.data_notificacao || "")}</div>
        <div>${escapeHtml(notificacao.numero_oficio)}</div>
      </div>
    </div>
    <div class="dest">
      <div>A</div>
      <div class="dest-nome">${escapeHtml(empresa)}</div>
      <div>${escapeHtml(endereco)}</div>
    </div>
    <div class="referencia">REFERÊNCIA: CONTRATO ${escapeHtml(contrato)}.</div>
    <div class="assunto">ASSUNTO: ${escapeHtml(assunto)}.</div>
    <div class="atc">A/C: ${escapeHtml(notificacao.ac || empresa)}</div>
    <div class="prezado">PREZADO(S),</div>
    <p><strong>1. A EDP SÃO PAULO DISTRIBUIÇÃO DE ENERGIA S.A.</strong>, concessionária de serviço público de distribuição de energia elétrica, notifica a ocupante acerca do quanto segue.</p>
    <p><strong>2.</strong> A DETENTORA identificou ocupação irregular em sua infraestrutura, conforme o constatado no(s) seguinte(s) endereço(s):</p>
    <table>
      <thead><tr><th>Endereço</th><th>Bairro</th><th>Cidade</th></tr></thead>
      <tbody>
        ${rows.map((row) => `<tr><td>${escapeHtml(row.endereco)}</td><td>${escapeHtml(row.bairro)}</td><td>${escapeHtml(row.cidade)}</td></tr>`).join("")}
      </tbody>
    </table>
    <div class="sec-title">RES 04 / REN 1044 / CONTRATO</div>
    <div class="bloco-legal">
      <p>A regularização às normas técnicas e regulamentares é de responsabilidade da ocupante, inclusive quanto aos custos, conforme cronograma acordado entre as partes.</p>
      <p><strong>11.6.3</strong> ${escapeHtml(notificacao.campo_11_6_3 || "Não sendo possível a regularização em razão de risco elevado, a DETENTORA poderá atuar imediatamente.")}</p>
    </div>
    <p><strong>3.</strong> Dessa forma, a DETENTORA NOTIFICA a OCUPANTE para que sane as irregularidades mencionadas, sob pena das sanções cabíveis.</p>
    <div class="assinatura-bloco">
      <p><strong>ATENCIOSAMENTE,</strong></p>
      <p><strong>EDP SÃO PAULO DISTRIBUIÇÃO DE ENERGIA S.A.</strong></p>
      <div class="linha-assinatura"></div>
      <strong>Assinatura</strong>
    </div>
  </div>
</body>
</html>`;
}
