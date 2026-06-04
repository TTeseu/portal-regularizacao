import { createClient } from "@base44/sdk";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const appId = process.env.BASE44_APP_ID || "690248a304b1770ec9b7c4ed";
const email = process.env.BASE44_EMAIL;
const password = process.env.BASE44_PASSWORD;
const outDir = path.resolve("exports", `base44-${appId}`);

if (!email || !password) {
  throw new Error("Defina BASE44_EMAIL e BASE44_PASSWORD para exportar via SDK.");
}

const base44 = createClient({ appId });
await base44.auth.loginViaEmailPassword(email, password);
await mkdir(outDir, { recursive: true });

const entities = ["Notificacao", "Empresa", "HistoricoDownload", "User"];
const pageSize = 500;

for (const entityName of entities) {
  const rows = [];
  let skip = 0;
  while (true) {
    const page = await base44.entities[entityName].filter({}, "-created_date", pageSize, skip);
    if (!Array.isArray(page) || page.length === 0) break;
    rows.push(...page);
    console.log(`${entityName}: ${rows.length}`);
    if (page.length < pageSize) break;
    skip += pageSize;
  }
  await writeFile(path.join(outDir, `${entityName}.json`), JSON.stringify(rows, null, 2), "utf8");
}

console.log(`Exportacao concluida em ${outDir}`);
