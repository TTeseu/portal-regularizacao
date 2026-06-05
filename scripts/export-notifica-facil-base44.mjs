import { createClient } from "@base44/sdk";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const appId = process.env.NOTIFICA_FACIL_BASE44_APP_ID || "68ee37fd420f50f0c3ee471e";
const token = process.env.BASE44_TOKEN;
const serverUrl = (process.env.BASE44_SERVER_URL || "https://base44.app").replace(/\/$/, "");
const outDir = path.resolve("exports", `base44-notifica-facil-${appId}`);
const pageSize = Number(process.env.BASE44_PAGE_SIZE || 5000);

if (!token) {
  throw new Error("Defina BASE44_TOKEN com um token de acesso valido do Base44 para exportar o Notifica Facil.");
}

const base44 = createClient({ appId, token, serverUrl });
const entities = [
  "Notification",
  "BaseNotificacao",
  "Empresa",
  "ActivityLog",
  "NotificationCounter",
  "RelatorioEmpresaClandestina",
  "Notificacao"
];

await mkdir(outDir, { recursive: true });

for (const entityName of entities) {
  const rows = [];
  let skip = 0;

  while (true) {
    const page = await base44.entities[entityName].list("-created_date", pageSize, skip);
    if (!Array.isArray(page) || page.length === 0) break;

    rows.push(...page);
    console.log(`${entityName}: ${rows.length}`);

    if (page.length < pageSize) break;
    skip += pageSize;
  }

  await writeFile(path.join(outDir, `${entityName}.json`), JSON.stringify(rows, null, 2), "utf8");
}

console.log(`Exportacao do Notifica Facil concluida em ${outDir}`);
