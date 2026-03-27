/**
 * Aplica a coluna guarantee_installments na tabela contracts.
 * Uso: node scripts/apply-guarantee-installments.mjs
 */

import { readFileSync } from "fs";

function loadEnv() {
  try {
    const content = readFileSync(new URL("../.env", import.meta.url), "utf-8");
    for (const line of content.split("\n")) {
      const eqIdx = line.indexOf("=");
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      const value = line.slice(eqIdx + 1).trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
      if (key && !process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env não encontrado
  }
}

const PROJECT_ID = "esinwvukarglzeoxioni";

const SQL = `
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS guarantee_installments integer DEFAULT 1;
`;

async function main() {
  loadEnv();

  const token = process.env.SUPABASE_ACCESS_TOKEN;

  if (!token) {
    console.error(
      "\n❌  SUPABASE_ACCESS_TOKEN não encontrado.\n" +
      "    Adicione ao seu .env:\n" +
      '    SUPABASE_ACCESS_TOKEN="sbp_xxxxxxxxxxxx"\n'
    );
    process.exit(1);
  }

  console.log(`\n🚀  Aplicando migration no projeto ${PROJECT_ID}...`);

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: SQL }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`\n❌  Falha (HTTP ${res.status}): ${body}\n`);
    process.exit(1);
  }

  console.log("\n✅  Coluna guarantee_installments adicionada com sucesso!\n");
}

main();
