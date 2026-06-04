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
