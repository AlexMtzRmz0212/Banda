/**
 * Regenera src/lib/db.types.ts a partir del esquema real.
 *
 *   npm run gen:types
 *
 * Correr después de cada migración: así el tipado de la app refleja la base
 * y no una copia escrita a mano que puede desfasarse.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local" });

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("\n  Falta SUPABASE_DB_URL en .env.local\n");
  process.exit(1);
}

const out = "src/lib/db.types.ts";
const types = execFileSync(
  "npx",
  ["supabase", "gen", "types", "typescript", "--db-url", dbUrl],
  { encoding: "utf8", shell: true, maxBuffer: 10 * 1024 * 1024 },
);

writeFileSync(out, types);
execFileSync("npx", ["oxfmt", out], { shell: true, stdio: "ignore" });
console.log(`\n  ✓ ${out} regenerado\n`);
