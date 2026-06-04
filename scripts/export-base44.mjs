import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const appId = process.env.BASE44_APP_ID || "690248a304b1770ec9b7c4ed";
const token = process.env.BASE44_TOKEN;
const serverUrl = (process.env.BASE44_SERVER_URL || "https://base44.app").replace(/\/$/, "");
const outDir = path.resolve("exports", `base44-${appId}`);

if (!token) {
  throw new Error("Defina BASE44_TOKEN com um token de acesso valido do Base44.");
}

await mkdir(outDir, { recursive: true });

const entities = ["Notificacao", "Empresa", "HistoricoDownload", "User"];
const pageSize = 500;

async function requestJson(url, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-App-Id": appId
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Base44 respondeu ${response.status}: ${body.slice(0, 300)}`);
    }

    return response.json();
  } catch (error) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      return requestJson(url, attempt + 1);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

for (const entityName of entities) {
  const rows = [];
  let skip = 0;
  while (true) {
    const url = new URL(`${serverUrl}/api/apps/${appId}/entities/${entityName}`);
    url.searchParams.set("sort", "-created_date");
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("skip", String(skip));

    const page = await requestJson(url);
    if (!Array.isArray(page) || page.length === 0) break;
    rows.push(...page);
    console.log(`${entityName}: ${rows.length}`);
    if (page.length < pageSize) break;
    skip += pageSize;
  }
  await writeFile(path.join(outDir, `${entityName}.json`), JSON.stringify(rows, null, 2), "utf8");
}

console.log(`Exportacao concluida em ${outDir}`);
