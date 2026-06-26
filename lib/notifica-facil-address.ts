import { formatPtBrDisplay } from "@/lib/format";

type AddressRecord = Record<string, unknown>;

function asAddressArray(value: unknown): AddressRecord[] {
  if (Array.isArray(value)) return value.filter((item): item is AddressRecord => !!item && typeof item === "object" && !Array.isArray(item));
  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return asAddressArray(parsed);
  } catch {
    return [];
  }
}

function uniqueKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
}

export function notificaFacilAddressCity(enderecosRevelia: unknown, fallback?: string | null) {
  const cities: string[] = [];
  const seen = new Set<string>();

  for (const row of asAddressArray(enderecosRevelia)) {
    const city = String(row.cidade || row.municipio || row.cidade_revelia || row.municipio_revelia || "").trim();
    if (!city) continue;

    const key = uniqueKey(city);
    if (seen.has(key)) continue;
    seen.add(key);
    cities.push(formatPtBrDisplay(city));
  }

  if (cities.length) return cities.join(", ");
  return formatPtBrDisplay(fallback);
}
