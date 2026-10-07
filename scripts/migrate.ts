/**
 * Aplica las migraciones de supabase/migrations en orden.
 *
 *   npm run migrate
 *
 * Lleva registro en la tabla `schema_migrations`, así que volver a correrlo
 * sólo aplica lo que falte. Cada archivo corre dentro de una transacción: si
 * una sentencia falla, ese archivo no deja nada a medias.
 *
 * Requiere SUPABASE_DB_URL (panel → Settings → Database → Connection string).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local" });

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error(
    "\n  Falta SUPABASE_DB_URL en .env.local\n\n" +
      "  Panel de Supabase → Settings → Database → Connection string → URI\n" +
      "  (usa el Session pooler y sustituye [YOUR-PASSWORD] por tu contraseña)\n",
  );
  process.exit(1);
}

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // Vive en `public`, así que PostgREST la expondría. Con RLS activo y cero
  // políticas queda cerrada a la API; este script se conecta como dueño de la
  // tabla, y el dueño no pasa por RLS.
  await client.query(`
    create table if not exists schema_migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    );
    alter table schema_migrations enable row level security;
  `);

  const { rows } = await client.query<{ name: string }>(
    "select name from schema_migrations",
  );
  const applied = new Set(rows.map((r) => r.name));

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  · ${file}  (ya aplicada)`);
      continue;
    }

    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (name) values ($1)", [
        file,
      ]);
      await client.query("commit");
      console.log(`  ✓ ${file}`);
      count++;
    } catch (error) {
      await client.query("rollback");
      const e = error as { message?: string; position?: string; hint?: string };
      console.error(`\n  ✗ ${file} falló — no se aplicó nada de este archivo\n`);
      console.error(`    ${e.message}`);
      if (e.hint) console.error(`    hint: ${e.hint}`);
      if (e.position) {
        const pos = Number(e.position);
        const upto = sql.slice(0, pos);
        const line = upto.split("\n").length;
        console.error(`    línea ${line}:  ${sql.split("\n")[line - 1]?.trim()}`);
      }
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log(
    count === 0
      ? "\n  Sin cambios: la base ya estaba al día.\n"
      : `\n  ${count} migración(es) aplicada(s).\n`,
  );
}

main().catch((error) => {
  console.error("\n  No se pudo conectar:\n ", error.message ?? error, "\n");
  process.exit(1);
});
