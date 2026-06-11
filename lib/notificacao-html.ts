import type { Notificacao } from "@prisma/client";

type AddressRow = {
  endereco: string;
  bairro: string;
  cidade: string;
};

type BuildOptions = {
  preview?: boolean;
};

function escapeHtml(value?: string | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseAddressRows(notificacao: Notificacao): AddressRow[] {
  const raw = notificacao.endereco_notificacao || "";
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const rows = parsed
        .map((row) => ({
          endereco: String(row?.endereco ?? "").trim(),
          bairro: String(row?.bairro ?? "").trim(),
          cidade: String(row?.cidade ?? "").trim()
        }))
        .filter((row) => row.endereco || row.bairro || row.cidade);
      if (rows.length > 0) return rows;
      return [{ endereco: "", bairro: "", cidade: "" }];
    }
  } catch {
    // Older imported records store addresses as plain text; fall through to line parsing.
  }

  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 0) {
    return lines.map((line) => ({
      endereco: line,
      bairro: notificacao.bairro || "",
      cidade: notificacao.cidade || ""
    }));
  }

  return [{
    endereco: notificacao.endereco || "",
    bairro: notificacao.bairro || "",
    cidade: notificacao.cidade || ""
  }];
}

function longDate(value?: string | null) {
  if (!value) return "";
  const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateMatch
    ? new Date(Number(dateMatch[3]), Number(dateMatch[2]) - 1, Number(dateMatch[1]))
    : isoMatch
      ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
      : new Date(value);

  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function companyAddress(notificacao: Notificacao) {
  return [
    notificacao.endereco || notificacao.rua_empresa_1 || notificacao.endereco_rep,
    notificacao.cidade || notificacao.cidade_empresa_1 || notificacao.cidade_rep,
    notificacao.estado || notificacao.estado_empresa_1 || notificacao.estado_rep
  ].filter(Boolean).join(", ");
}

function companyQualification(notificacao: Notificacao, empresa: string) {
  const endereco = companyAddress(notificacao);
  const cnpj = notificacao.cnpj || notificacao.cnpj_empresa_1 || notificacao.cnpj_empresa_2 || notificacao.cnpj_condominio || "";
  return `${empresa}${endereco ? `, COM SEDE NA ${endereco}` : ""}${cnpj ? `, INSCRITA NO CNPJ/MF SOB O N.º ${cnpj}` : ""}`;
}

function renderAddressTables(rows: AddressRow[]) {
  const normalized = rows.length > 0 ? rows : [{ endereco: "", bairro: "", cidade: "" }];
  const chunks: AddressRow[][] = [];
  chunks.push(normalized.slice(0, 12));
  for (let index = 12; index < normalized.length; index += 26) {
    chunks.push(normalized.slice(index, index + 26));
  }

  return chunks.map((chunk, index) => `
    <section class="address-table-block${index > 0 ? " continued" : ""}">
      ${index > 0 ? '<p class="address-continued-title">Anexo I - Endereços (continuação)</p>' : ""}
      <table class="address-table">
        <colgroup><col><col><col></colgroup>
        <thead>
          <tr>
            <th>Endereço</th>
            <th>Bairro</th>
            <th>Cidade</th>
          </tr>
        </thead>
        <tbody>
          ${chunk.map((row) => `
            <tr>
              <td>${escapeHtml(row.endereco) || "&nbsp;"}</td>
              <td>${escapeHtml(row.bairro) || "&nbsp;"}</td>
              <td>${escapeHtml(row.cidade) || "&nbsp;"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `).join("");
}

export function sanitizeNotificacaoHtml(html: string) {
  return html
    .replace(/\s*\(o\s*"<strong>CONTRATO<\/strong>"\),?/gi, "")
    .replace(/\s*\(o\s*"<span class="bold">Contrato<\/span>"\),?/gi, "")
    .replace(/<div class="assinatura-label">Assinatura<\/div>/gi, "");
}

export function buildNotificacaoHtml(notificacao: Notificacao, options: BuildOptions = {}) {
  if (notificacao.html_content) return sanitizeNotificacaoHtml(notificacao.html_content);

  const empresa = notificacao.empresa || notificacao.empresa_1 || notificacao.empresa_rep || "RAZÃO SOCIAL DA EMPRESA DE TELECOM";
  const contrato = notificacao.contrato_numero || notificacao.numero_contrato_1 || notificacao.numero_contrato_2 || "XXXXX";
  const referencia = notificacao.numero_oficio || "Referência interna";
  const data = longDate(notificacao.data_notificacao) || notificacao.data_notificacao || "";
  const prazo = notificacao.prazo_dias || notificacao.prazo_resposta || "10 (dez) dias";
  const empresaQualificada = companyQualification(notificacao, empresa);
  const rows = parseAddressRows(notificacao);
  const clausula_11_6_3 = notificacao.campo_11_6_3?.trim();
  const r1Style = options.preview
    ? "color:#d71920; font-size:28px; font-weight:700; user-select:none; line-height:1;"
    : "color:#fff; font-size:1px; user-select:none; line-height:0;";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1" name="viewport"/>
<title>Notificação EDP - Ocupação Irregular</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Dancing+Script:wght@600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #dfe6ee; font-family: 'Noto Serif', 'Times New Roman', serif; font-size: 10pt; color: #000; }
  .page { width: 794px; margin: 20px auto; background: #fff; padding: 60px 80px; box-shadow: 0 4px 18px rgba(0,0,0,.15); }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; break-inside: avoid-page; page-break-inside: avoid; }
  .logo { width: 70px; height: auto; }
  .ref-block { text-align: right; font-size: 10pt; font-weight: 700; }
  .meta-data { font-weight: normal; margin-bottom: 4px; }
  .dest { margin-bottom: 14px; font-size: 10pt; line-height: 1.45; }
  .dest-nome { font-weight: 700; }
  .referencia, .assunto, .atc, .prezado { font-size: 10pt; font-weight: 700; }
  .referencia, .assunto { margin-bottom: 8px; }
  .assunto { text-transform: uppercase; line-height: 1.35; }
  .atc, .prezado { margin-bottom: 12px; }
  p, .inciso, .bloco-legal { font-size: 10pt; line-height: 1.4; text-align: justify; margin-bottom: 8px; display: block; }
  .sec-title { font-size: 10pt; font-weight: 700; color: #b11919; margin: 10px 0 6px 28px; break-after: avoid-page; page-break-after: avoid; }
  .bloco-legal { margin-left: 28px; margin-bottom: 6px; }
  .bloco-legal p { margin-bottom: 5px; }
  .inciso { margin-left: 46px; margin-bottom: 5px; }
  .cl-1 { margin-left: 28px; margin-bottom: 6px; }
  .cl-2 { margin-left: 46px; margin-bottom: 6px; }
  .cl-3 { margin-left: 64px; margin-bottom: 6px; }
  .cl-1 p, .cl-2 p, .cl-3 p { margin-bottom: 5px; }
  .tbl-wrap { margin: 8px 0 10px; }
  .address-table-block { margin: 4mm 0 5mm; break-inside: avoid-page; page-break-inside: avoid; }
  .address-table-block.continued { break-before: page; page-break-before: always; margin-top: 60px; padding-top: 0; }
  .address-continued-title { margin: 0 0 3mm 0; font-size: 10pt; font-weight: 700; text-align: center; text-transform: uppercase; }
  .address-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .address-table th, .address-table td { border: 1px solid #000; padding: 4px 6px; text-align: left; vertical-align: top; }
  .address-table th { text-align: center; font-weight: 700; background: #f3f3f3; }
  .address-table col:nth-child(1) { width: 52%; }
  .address-table col:nth-child(2), .address-table col:nth-child(3) { width: 24%; }
  .address-table tr { break-inside: avoid-page; page-break-inside: avoid; }
  .assinatura-bloco { margin-top: 15px; text-align: center; break-inside: avoid; page-break-inside: avoid; }
  .assinatura-empresa { font-weight: 700; font-size: 10.5pt; margin-bottom: 20px; }
  .docusign-wrap { display: flex; flex-direction: column; align-items: center; }
  .linha-assinatura { width: 280px; border-top: 1px solid #000; margin: 0 auto 4px; }
  .signature-line-wrap { position: relative; width: 280px; margin: 0 auto 4px; }
  .signature-line-wrap .linha-assinatura { margin: 0; }
  .r1-marker { position: absolute; left: -34px; top: -18px; }
  .assinatura-label { font-size: 10pt; font-weight: 700; margin-top: 3px; }
  .editable { display: inline; padding: 0 1mm; }
  @page { margin: 20mm 25mm; }
  @media print { body { background: #fff; } .page { margin: 0; box-shadow: none; padding: 0; width: auto; } .address-table-block.continued { margin-top: 0; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <img class="logo" src="https://captadores.org.br/wp-content/uploads/2024/08/edp.png" alt="EDP"/>
    <div class="ref-block">
      <div class="meta-data"><span class="editable">São José dos Campos - SP</span>, <span class="editable">${escapeHtml(data)}.</span></div>
      <span class="editable">${escapeHtml(referencia)}</span>
    </div>
  </div>

  <div class="dest">
    <div>A</div>
    <div class="dest-nome"><span class="editable">${escapeHtml(empresa)}</span></div>
    <div><span class="editable">${escapeHtml(companyAddress(notificacao))}</span></div>
  </div>

  <div class="referencia">REFERÊNCIA:&nbsp; CONTRATO <span class="editable">${escapeHtml(contrato)}</span> .</div>
  <div class="assunto">ASSUNTO: OCUPAÇÃO IRREGULAR - DESCUMPRIMENTO AO CONTRATO E ÀS NORMAS TÉCNICAS E REGULAMENTARES APLICÁVEIS.</div>
  <div class="atc">A/C:&nbsp; <span class="editable">${escapeHtml(empresa)}</span></div>
  <div class="prezado">PREZADO(S),</div>

  <p><strong>1. A EDP SÃO PAULO DISTRIBUIÇÃO DE ENERGIA S.A.</strong> concessionária de serviço público de distribuição de energia elétrica, <span class="editable">com sede na RUA WERBER VON SIEMENS, 111, CXPST 44191-0 CONJ. 22 BLOCO A SALA 1, LAPA DE BAIXO - SÃO PAULO - SP, inscrita no CNPJ/MF sob o n.º 02.302.100/0001-06</span>, neste ato representada na forma de seu estatuto social (a "<strong>DETENTORA</strong>"), fazendo referência ao "Contrato de Compartilhamento de Infraestrutura - Pontos de Fixação em Poste - Nº <span class="editable">${escapeHtml(contrato)}</span>", com a <strong><span class="editable">${escapeHtml(empresaQualificada)}</span></strong> (a "<strong>OCUPANTE</strong>"), expõe e notifica acerca do quanto segue.</p>

  <p><strong>2. A DETENTORA</strong> identificou ocupação irregular em sua infraestrutura de distribuição de energia elétrica por cabos, fios, cordoalha e equipamentos de telecomunicações da <strong>OCUPANTE</strong>, em claro descumprimento ao <strong>CONTRATO</strong> e às Normas Técnicas e Regulamentares aplicáveis, conforme o constatado e descrito no Anexo I dessa notificação, no(s) seguinte(s) endereço(s):</p>

  <div class="tbl-wrap">${renderAddressTables(rows)}</div>

  <p><strong>3.</strong> Nos termos da Resolução Conjunta ANEEL/ANATEL n.º 004/2014 (a "<strong>RES 04</strong>"), da Resolução Normativa ANEEL n.º 1044/2022 (a "<strong>REN 1044</strong>") e do <strong>CONTRATO</strong> cabe à <strong>OCUPANTE</strong> regularizar e manter regular as ocupações dos cabos, fios, cordoalha e equipamentos sob sua responsabilidade, em estrita observância às normas técnicas e regulamentares, arcando com os custos relacionados e no prazo definido pela <strong>DETENTORA</strong>, nos termos do <strong>CONTRATO</strong> ou cronograma acordado entre as Partes, independentemente de qualquer notificação.</p>

  <div class="sec-title">RES 04</div>
  <div class="bloco-legal">
    <p><strong>Art. 4º</strong> No compartilhamento de postes, as prestadoras de serviços de telecomunicações devem seguir o plano de ocupação de infraestrutura da distribuidora de energia elétrica e as normas técnicas aplicáveis, em especial:</p>
    <p>[...]</p>
    <p><strong>§ 1º</strong> O compartilhamento de postes não deve comprometer a segurança de pessoas e instalações, os níveis de qualidade e a continuidade dos serviços prestados pelas distribuidoras de energia elétrica.</p>
    <p><strong>§ 2º</strong> As distribuidoras de energia elétrica devem zelar para que o compartilhamento de postes mantenha-se regular às normas técnicas.</p>
    <p><strong>§ 3º</strong> As distribuidoras de energia elétrica devem notificar as prestadoras de serviços de telecomunicações acerca da necessidade de regularização, sempre que verificado o descumprimento ao disposto no caput deste artigo.</p>
    <p><strong>§ 4º</strong> A notificação de que trata o § 3º deve conter, no mínimo, a localização do poste a ser regularizado e a descrição da não conformidade identificada pela distribuidora de energia elétrica.</p>
    <p><strong>§ 5º</strong> A regularização às normas técnicas é de responsabilidade da prestadora de serviços de telecomunicações, inclusive quanto aos custos, conforme cronograma de execução acordado entre as partes.</p>
    <p><strong>§ 6º</strong> O cronograma de que trata o §5º deve considerar o prazo máximo de 1 (um) ano para a execução da regularização, limitado a 2100 (dois mil e cem) postes por distribuidora de energia elétrica por ano, os quais devem estar agregados em conjuntos elétricos.</p>
    <p><strong>§ 7º</strong> Toda e qualquer situação emergencial ou que envolva risco de acidente deve ser priorizada e regularizada imediatamente pelas prestadoras de serviços de telecomunicações, independentemente da notificação prévia da distribuidora de energia elétrica.</p>
    <p><strong>§ 8º</strong> A ausência de notificação da distribuidora de energia elétrica não exime as prestadoras de serviços de telecomunicações da responsabilidade em manter a ocupação dos Pontos de Fixação de acordo com as normas técnicas aplicáveis.</p>
  </div>

  <div class="sec-title">REN 1044</div>
  <div class="bloco-legal">
    <p><strong>Art. 6º</strong> É de responsabilidade dos ocupantes e do prestador de PLC respeitar as normas técnicas e regulamentares aplicáveis, manter o compartilhamento em conformidade com as normas aplicáveis, e executar as correções necessárias, inclusive quanto aos custos.</p>
    <p><strong>§ 1º</strong> O detentor deve zelar para que o compartilhamento de infraestrutura se mantenha regular às normas técnicas e regulamentares aplicáveis.</p>
    <p><strong>§ 2º</strong> A ausência de notificação do detentor para regularização não exime o ocupante de cumprir o disposto no caput deste artigo.</p>
    <p>[...]</p>
    <p><strong>Art. 12</strong> O detentor deve notificar o ocupante sobre a necessidade de regularização da ocupação, nos termos do art. 4º da Resolução Conjunta ANEEL/Anatel nº 004, de 2014, sempre que for constatado:</p>
  </div>
  <div class="inciso">I -- descumprimento às normas técnicas e regulamentares aplicáveis ao compartilhamento; ou</div>
  <div class="inciso">II -- ocupação à revelia.</div>
  <div class="bloco-legal">
    <p><strong>§ 1º</strong> A regularização às normas técnicas e regulamentares é de responsabilidade do ocupante, inclusive quanto aos custos, conforme cronograma de execução acordado entre as partes.</p>
    <p><strong>§ 2º</strong> Para os casos de que trata o caput deste artigo, o detentor pode solicitar o traçado georreferenciado ou relatório fotográfico dos cabos já instalados em sua infraestrutura.</p>
  </div>

  <div class="sec-title">CONTRATO</div>
  <div class="bloco-legal"><p><strong>11.6</strong> As ocupações previstas no <strong>CONTRATO</strong> deverão ser realizadas em estrita obediência à legislação aplicável, tal como àquelas previstas na Cláusula 3.1 do <strong>CONTRATO</strong> e demais condições aqui previstas.</p></div>
  <div class="cl-2"><p><strong>11.6.1</strong> Em caso de constatação de ocupações em desacordo com o contido no <strong>CONTRATO</strong>, ou, ainda, todo e qualquer cabo, equipamento, materiais ou condutores da <strong>OCUPANTE</strong> instalados em não conformidade com o <strong>PROJETO TÉCNICO</strong> aprovado e liberado pela <strong>DETENTORA</strong>, a <strong>OCUPANTE</strong> deverá providenciar a regularização, conforme prazo a ser estabelecido pela <strong>DETENTORA</strong> em notificação específica.</p></div>
  <div class="cl-3"><p><strong>11.6.1.1</strong> Esse prazo será de até 48 (quarenta e oito) horas quando a ocupação apresentar risco de acidente ao sistema elétrico ou a terceiros. Nas hipóteses de os riscos serem iminentes, a <strong>OCUPANTE</strong> deverá providenciar a imediata regularização, independentemente de notificação da <strong>DETENTORA</strong>.</p></div>
  <div class="cl-2"><p><strong>11.6.2</strong> Não havendo a regularização por parte da <strong>OCUPANTE</strong> no prazo estabelecido, a <strong>DETENTORA</strong> poderá fazê-lo em caráter provisório e precário, se entender conveniente, devendo ser ressarcida pela <strong>OCUPANTE</strong> das despesas incorridas, sem prejuízo da cobrança da multa prevista no <strong>CONTRATO</strong>. Nesta hipótese, a <strong>OCUPANTE</strong> se responsabilizará por eventuais perdas e danos causados aos bens da <strong>OCUPANTE</strong> e/ou a terceiros.</p></div>
  ${clausula_11_6_3 ? `<div class="cl-2"><p><strong>11.6.3</strong> ${escapeHtml(clausula_11_6_3)}</p></div>` : ""}
  <div class="bloco-legal"><p><strong>11.7</strong> A ausência de notificação da <strong>DETENTORA</strong> não exime a <strong>OCUPANTE</strong> de sua responsabilidade em manter a ocupação dos <strong>PONTOS DE FIXAÇÃO</strong> em plena conformidade com a legislação prevista na Cláusula 3.1 do <strong>CONTRATO</strong>, ou ainda, legislação superveniente.</p></div>

  <p><strong>4.</strong> Dessa forma, ante o todo acima exposto, a <strong>DETENTORA NOTIFICA</strong> a <strong>OCUPANTE</strong> para que, em até <span class="editable">${escapeHtml(prazo)}</span>, sane as irregularidades mencionadas nessa notificação, sob pena das sanções e consequências contratuais, regulatórias e legais cabíveis, sem prejuízo da aplicação, desde já, das penalidades estabelecidas em <strong>CONTRATO</strong>.</p>
  <p><strong>5.</strong> Por fim, a <strong>DETENTORA</strong> esclarece que caso a irregularidade venha a caracterizar uma situação emergencial ou que envolva riscos de acidente, irá remover os cabos, fios, cordoalha ou equipamentos, com a cobrança dos valores por ela suportados nesse sentido, nos termos dos artigos 14 e 15 da <strong>REN 1044</strong>.</p>
  <div class="bloco-legal"><p><strong>Art. 14</strong> O detentor pode retirar cabos, fios, cordoalhas ou equipamentos de sua infraestrutura sem prévia autorização da Comissão de Resolução de Conflitos quando constatar:</p></div>
  <div class="inciso">I -- ocupação clandestina;</div>
  <div class="inciso" style="margin-bottom:5px">II -- situações emergenciais; ou</div>
  <div class="inciso" style="margin-bottom:8px">III -- situações que envolvam risco de acidente.</div>
  <div class="bloco-legal"><p><strong>Art. 15</strong> O detentor pode cobrar do ocupante o ressarcimento pelos custos incorridos na eventual retirada dos cabos, fios, cordoalha ou equipamentos de responsabilidade do ocupante.</p></div>

  <div style="break-inside: avoid; page-break-inside: avoid;">
    <p><strong>6.</strong> A <strong>DETENTORA</strong> reserva todos os seus direitos e remédios, contratuais, regulatórios e legais, com relação às matérias objeto desta correspondência.</p>
    <div class="assinatura-bloco">
      <p style="text-align:center; margin-bottom:10px;"><strong>ATENCIOSAMENTE,</strong></p>
      <p class="assinatura-empresa" style="text-align:center;"><strong>EDP SÃO PAULO DISTRIBUIÇÃO DE ENERGIA S.A.</strong></p>
      <div class="docusign-wrap" style="margin-top:14px;">
        <div style="min-height:48px; min-width:260px;"></div>
        <div class="signature-line-wrap">
          <span class="r1-marker" style="${r1Style}">R1</span>
          <div class="linha-assinatura"></div>
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}
