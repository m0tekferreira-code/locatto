/**
 * Script para aplicar a migration de cobranças padrão no contrato.
 * Roda apenas UMA VEZ (as colunas são idempotentes: ADD COLUMN IF NOT EXISTS).
 *
 * Uso:
 *   node scripts/apply-migration.mjs
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const PROJECT_ID = "esinwvukarglzeoxioni";

// Carrega .env manualmente (sem dependências externas)
function loadEnv() {
  try {
    const __dir = dirname(fileURLToPath(import.meta.url));
    const envPath = join(__dir, "../.env");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const eqIdx = line.indexOf("=");
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      const value = line.slice(eqIdx + 1).trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
      if (key && !process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env não encontrado — usa variáveis do ambiente
  }
}

const SQL = `
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS condo_fee          numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_amount       numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS electricity_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gas_amount         numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS internet_amount    numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cleaning_fee       numeric DEFAULT NULL;
`;

async function main() {
  loadEnv();

  const token = process.env.SUPABASE_ACCESS_TOKEN;

  if (!token) {
    console.error(
      "\n\u274c  SUPABASE_ACCESS_TOKEN não encontrado.\n" +
      "    Gere um Personal Access Token em:\n" +
      "    https://supabase.com/dashboard/account/tokens\n" +
      "    E adicione ao seu .env:\n" +
      '    SUPABASE_ACCESS_TOKEN=\"sbp_xxxxxxxxxxxx\"\n'
    );
    process.exit(1);
  }

  console.log(`\n\uD83D\uDE80  Aplicando migration no projeto ${PROJECT_ID}...`);

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
    console.error(`\n\u274c  Falha (HTTP ${res.status}): ${body}\n`);
    process.exit(1);
  }

  console.log(
    "\n\u2705  Migration aplicada com sucesso!\n" +
    "    Colunas adicionadas na tabela contracts:\n" +
    "      \u2022 condo_fee\n" +
    "      \u2022 water_amount\n" +
    "      \u2022 electricity_amount\n" +
    "      \u2022 gas_amount\n" +
    "      \u2022 internet_amount\n" +
    "      \u2022 cleaning_fee\n"
  );
}

main();
