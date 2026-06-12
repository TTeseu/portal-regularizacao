export function cnpjDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function onlyCNPJDigits(value: string | null | undefined) {
  return cnpjDigits(value).slice(0, 14);
}

export function applyCNPJMask(value: string | null | undefined) {
  const digits = onlyCNPJDigits(value);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

export function isValidCNPJ(value: string | null | undefined) {
  return cnpjDigits(value).length === 14;
}

export function formatCNPJ(value: string | null | undefined) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return isValidCNPJ(value) ? applyCNPJMask(value) : null;
}

export function requireFormattedCNPJ(value: string | null | undefined, label = "CNPJ") {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const formatted = formatCNPJ(value);
  if (!formatted) throw new Error(`${label} inválido.`);
  return formatted;
}

export function formatCNPJDisplay(value: string | null | undefined) {
  return formatCNPJ(value) || value || "-";
}

export function cnpjSearchTerm(value: string | null | undefined) {
  const formatted = formatCNPJ(value);
  return formatted || String(value ?? "").trim();
}
