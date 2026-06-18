import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK || "1"
  }
});

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
