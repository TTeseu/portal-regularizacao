export const EDP_LOGO_SOURCE_URL = "https://captadores.org.br/wp-content/uploads/2024/08/edp.png";
export const EDP_LOGO_PUBLIC_PATH = "/edp-logo-document.png";
export const EDP_LOGO_DATA_URI = EDP_LOGO_PUBLIC_PATH;

export function normalizeEdpLogoSources(html: string, replacement = EDP_LOGO_PUBLIC_PATH) {
  return html
    .replaceAll(EDP_LOGO_SOURCE_URL, replacement)
    .replace(/data:image\/svg\+xml;charset=utf-8,[^"']*aria-label%3D%22EDP%22[^"']*/gi, replacement);
}
