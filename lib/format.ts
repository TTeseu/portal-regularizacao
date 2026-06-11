export function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function formatDateTime(value?: Date | string | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export function onlyFilled<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== "" && value !== undefined)
  );
}

export function csvList(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : value.split(",").map((item) => item.trim()).filter(Boolean);
}

const PT_BR_DISPLAY_FIXES = new Map<string, string>([
  ["SAO PAULO", "SÃO PAULO"],
  ["SAO SEBASTIAO", "SÃO SEBASTIÃO"],
  ["SAO JOSE DOS CAMPOS", "SÃO JOSÉ DOS CAMPOS"],
  ["SAO JOSE DO RIO PRETO", "SÃO JOSÉ DO RIO PRETO"],
  ["SAO VICENTE", "SÃO VICENTE"],
  ["SAO BERNARDO DO CAMPO", "SÃO BERNARDO DO CAMPO"],
  ["SAO CAETANO DO SUL", "SÃO CAETANO DO SUL"],
  ["SAO ROQUE", "SÃO ROQUE"],
  ["SAO CARLOS", "SÃO CARLOS"],
  ["TAUBATE", "TAUBATÉ"],
  ["JACAREI", "JACAREÍ"],
  ["POA", "POÁ"],
  ["ITAJUBA", "ITAJUBÁ"],
  ["MOGI GUACU", "MOGI GUAÇU"],
  ["MOGI MIRIM", "MOGI MIRIM"],
  ["GUARATINGUETA", "GUARATINGUETÁ"],
  ["CARAGUATATUBA", "CARAGUATATUBA"],
  ["ITAQUAQUECETUBA", "ITAQUAQUECETUBA"],
  ["FERRAZ DE VASCONCELOS", "FERRAZ DE VASCONCELOS"],
  ["SANTO ANDRE", "SANTO ANDRÉ"],
  ["MAUA", "MAUÁ"],
  ["DIADEMA", "DIADEMA"],
  ["GUARULHOS", "GUARULHOS"],
  ["BARUERI", "BARUERI"]
]);

export function formatPtBrDisplay(value?: string | null) {
  if (!value) return "-";
  const trimmed = value.trim();
  const fixed = PT_BR_DISPLAY_FIXES.get(trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase());
  return fixed || trimmed;
}
