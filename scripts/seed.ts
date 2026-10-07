/**
 * Siembra el catálogo de hojas de evaluación.
 *
 *   npm run seed
 *
 * Idempotente: vuelve a correrse sin duplicar. Las plantillas se identifican
 * por (code, version); si una versión ya existe, se actualiza su encabezado y
 * se reemplazan sus criterios. Para cambiar el reglamento sin tocar eventos ya
 * calificados, sube CATALOG_VERSION en src/lib/sheets.ts.
 *
 * Usa la service_role key, que ignora el RLS — por eso vive en un script y no
 * en la aplicación.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
  CATALOG_VERSION,
  SHEETS,
  TOTAL_COMPILATORIO,
  maxPointsOf,
  totalCompilatorio,
} from "../src/lib/sheets";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "\n  Faltan credenciales.\n\n" +
      "  Copia .env.example a .env.local y llena:\n" +
      "    NEXT_PUBLIC_SUPABASE_URL\n" +
      "    SUPABASE_SERVICE_ROLE_KEY   (panel de Supabase → Settings → API)\n",
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  // Red de seguridad: si una edición al catálogo rompe la suma, no se siembra.
  const total = totalCompilatorio();
  if (total !== TOTAL_COMPILATORIO) {
    throw new Error(
      `El catálogo suma ${total} pts y el reglamento marca ${TOTAL_COMPILATORIO}. ` +
        `Revisa src/lib/sheets.ts antes de sembrar.`,
    );
  }

  console.log(`\n  Sembrando catálogo v${CATALOG_VERSION} — ${SHEETS.length} hojas\n`);

  for (const sheet of SHEETS) {
    const maxPoints = maxPointsOf(sheet);

    const { data: template, error: templateError } = await db
      .from("sheet_templates")
      .upsert(
        {
          code: sheet.code,
          name: sheet.name,
          version: CATALOG_VERSION,
          judge_slots: sheet.judgeSlots,
          counts_toward_total: sheet.countsTowardTotal,
          max_points: maxPoints,
        },
        { onConflict: "code,version" },
      )
      .select("id")
      .single();

    if (templateError) throw templateError;

    // Reemplazo total de criterios: evita que queden huérfanos renglones que
    // se hayan quitado del reglamento dentro de la misma versión.
    const { error: deleteError } = await db
      .from("sheet_criteria")
      .delete()
      .eq("template_id", template.id);

    if (deleteError) throw deleteError;

    const { error: criteriaError } = await db.from("sheet_criteria").insert(
      sheet.criteria.map((c, i) => ({
        template_id: template.id,
        section: c.section,
        position: i + 1,
        label: c.label,
        deduction_hint: c.deductionHint ?? null,
      })),
    );

    if (criteriaError) throw criteriaError;

    const jueces = sheet.judgeSlots === 2 ? " × 2 jueces" : "";
    const nota = sheet.countsTowardTotal ? "" : "  (no suma al total)";
    console.log(
      `  ✓ ${sheet.name.padEnd(42)} ${String(sheet.criteria.length).padStart(2)} criterios` +
        `  ${String(maxPoints).padStart(4)} pts${jueces}${nota}`,
    );
  }

  console.log(`\n  Total compilatorio: ${total} pts\n`);
}

main().catch((error) => {
  console.error("\n  Falló el sembrado:\n", error.message ?? error, "\n");
  process.exit(1);
});
