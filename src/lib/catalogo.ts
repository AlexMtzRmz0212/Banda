import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db.types";
import {
  CATALOG_VERSION,
  type Convocatoria,
  buildCatalog,
} from "@/lib/sheets";

/**
 * Arma las hojas de un evento.
 *
 * Las plantillas no se comparten entre eventos: cada uno recibe su propia
 * copia, generada desde src/lib/sheets.ts con los toques y marchas que pida
 * su convocatoria. Así, cambiar el reglamento el año que viene no altera lo
 * que ya se calificó.
 */
export async function crearPlantillasDelEvento(
  db: SupabaseClient<Database>,
  eventId: string,
  conv: Convocatoria,
): Promise<{ error: string | null }> {
  const hojas = buildCatalog(conv);

  const { data: plantillas, error: templatesError } = await db
    .from("sheet_templates")
    .insert(
      hojas.map((h) => ({
        event_id: eventId,
        code: h.code,
        name: h.name,
        version: CATALOG_VERSION,
        judge_slots: h.judgeSlots,
        counts_toward_total: h.countsTowardTotal,
        max_points: h.maxPoints,
      })),
    )
    .select("id, code");

  if (templatesError) return { error: templatesError.message };

  const porCodigo = new Map(plantillas.map((p) => [p.code, p.id]));

  const criterios = hojas.flatMap((h) =>
    h.criteria.map((c, i) => ({
      template_id: porCodigo.get(h.code)!,
      section: c.section,
      position: i + 1,
      label: c.label,
      deduction_hint: c.deductionHint ?? null,
    })),
  );

  const { error: criteriaError } = await db
    .from("sheet_criteria")
    .insert(criterios);

  if (criteriaError) return { error: criteriaError.message };

  return { error: null };
}
