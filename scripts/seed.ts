/**
 * Siembra el catálogo madre de hojas de evaluación.
 *
 *   npm run seed
 *
 * El catálogo son las plantillas con `event_id` NULL: la referencia de la que
 * cada evento saca su propia copia. Se siembra con la convocatoria del PDF
 * (3 toques, 1 marcha); un evento concreto puede pedir más o menos.
 *
 * Idempotente: vuelve a correrse sin duplicar. Usa la service_role key, que
 * ignora el RLS — por eso vive en un script y no en la aplicación.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
  CATALOG_VERSION,
  CONVOCATORIA_PDF,
  TOTAL_PDF,
  buildCatalog,
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

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  // Red de seguridad: si una edición al catálogo rompe la suma del PDF, no se
  // siembra. El total varía por convocatoria, pero la del PDF debe dar 665.
  const total = totalCompilatorio(CONVOCATORIA_PDF);
  if (total !== TOTAL_PDF) {
    throw new Error(
      `Con la convocatoria del PDF el catálogo suma ${total} pts y debería dar ` +
        `${TOTAL_PDF}. Revisa src/lib/sheets.ts antes de sembrar.`,
    );
  }

  const hojas = buildCatalog(CONVOCATORIA_PDF);
  console.log(
    `\n  Catálogo v${CATALOG_VERSION} — ${hojas.length} hojas ` +
      `(convocatoria del PDF: ${CONVOCATORIA_PDF.toques} toques, ` +
      `${CONVOCATORIA_PDF.marchas} marcha)\n`,
  );

  for (const hoja of hojas) {
    // No se usa upsert: la unicidad del catálogo es un índice parcial
    // (code, version) WHERE event_id IS NULL, que PostgREST no sabe nombrar
    // en un ON CONFLICT.
    const { data: existente, error: lookupError } = await db
      .from("sheet_templates")
      .select("id")
      .eq("code", hoja.code)
      .eq("version", CATALOG_VERSION)
      .is("event_id", null)
      .maybeSingle();

    if (lookupError) throw lookupError;

    const campos = {
      code: hoja.code,
      name: hoja.name,
      version: CATALOG_VERSION,
      judge_slots: hoja.judgeSlots,
      counts_toward_total: hoja.countsTowardTotal,
      max_points: hoja.maxPoints,
      event_id: null,
    };

    let templateId: string;
    if (existente) {
      const { error } = await db
        .from("sheet_templates")
        .update(campos)
        .eq("id", existente.id);
      if (error) throw error;
      templateId = existente.id;
    } else {
      const { data, error } = await db
        .from("sheet_templates")
        .insert(campos)
        .select("id")
        .single();
      if (error) throw error;
      templateId = data.id;
    }

    // Reemplazo total: evita que sobrevivan renglones quitados del reglamento.
    const { error: deleteError } = await db
      .from("sheet_criteria")
      .delete()
      .eq("template_id", templateId);
    if (deleteError) throw deleteError;

    const { error: criteriaError } = await db.from("sheet_criteria").insert(
      hoja.criteria.map((c, i) => ({
        template_id: templateId,
        section: c.section,
        position: i + 1,
        label: c.label,
        deduction_hint: c.deductionHint ?? null,
      })),
    );
    if (criteriaError) throw criteriaError;

    const jueces = hoja.judgeSlots === 2 ? " × 2 jueces" : "";
    const nota = hoja.countsTowardTotal ? "" : "  (no suma al total)";
    console.log(
      `  ✓ ${hoja.name.padEnd(42)} ${String(hoja.criteria.length).padStart(2)} criterios` +
        `  ${String(hoja.maxPoints).padStart(4)} pts${jueces}${nota}`,
    );
  }

  console.log(`\n  Total con la convocatoria del PDF: ${total} pts\n`);
}

main().catch((error) => {
  console.error("\n  Falló el sembrado:\n", error.message ?? error, "\n");
  process.exit(1);
});
