import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EDP_LOGO_PUBLIC_PATH, normalizeEdpLogoSources } from "@/lib/edp-logo";

const logoFile = readFileSync(join(process.cwd(), "public", "edp-logo-document.png"));

export const EDP_LOGO_PDF_DATA_URI = `data:image/png;base64,${logoFile.toString("base64")}`;

export function normalizeEdpLogoSourcesForPdf(html: string) {
  return normalizeEdpLogoSources(html, EDP_LOGO_PDF_DATA_URI)
    .replaceAll(EDP_LOGO_PUBLIC_PATH, EDP_LOGO_PDF_DATA_URI);
}
