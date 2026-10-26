"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireJudge } from "@/lib/dal";

/**
 * Server Actions del juez.
 *
 * Cada una verifica la sesión por su cuenta: una Server Action se invoca como
 * cualquier endpoint público. Y por debajo, el RLS sólo deja escribir en hojas
 * que son de este juez y siguen abiertas.
 */

export type ActionState = { error: string | null; ok?: boolean };

/**
 * Abre la hoja de una banda, creándola si es la primera vez.
 *
 * La hoja no se crea al asignar al juez porque las bandas se dan de alta
 * durante el evento: se crea cuando el juez entra a calificar.
 */
export async function abrirHoja(assignmentId: string, bandId: string) {
  await requireJudge();
  const supabase = await createClient();

  const { data: existente } = await supabase
    .from("score_sheets")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("band_id", bandId)
    .maybeSingle();

  if (existente) redirect(`/juez/hoja/${existente.id}`);

  const { data: banda } = await supabase
    .from("bands")
    .select("event_id")
    .eq("id", bandId)
    .single();

  const { data: nueva, error } = await supabase
    .from("score_sheets")
    .insert({
      assignment_id: assignmentId,
      band_id: bandId,
      event_id: banda!.event_id,
    })
    .select("id")
    .single();

  if (error) {
    // Carrera: dos pestañas abriendo la misma hoja. La restricción única
    // (band_id, assignment_id) la impide; basta con recuperar la que ganó.
    const { data: yaCreada } = await supabase
      .from("score_sheets")
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("band_id", bandId)
      .maybeSingle();

    if (yaCreada) redirect(`/juez/hoja/${yaCreada.id}`);
    throw new Error(error.message);
  }

  redirect(`/juez/hoja/${nueva.id}`);
}

/**
 * Guarda una calificación.
 *
 * Es un upsert sobre (sheet_id, criterion_id): volver a mandar lo mismo no
 * duplica nada. Ésa es la base sobre la que se montará la cola sin conexión.
 */
export async function guardarCalificacion(
  sheetId: string,
  criterionId: string,
  value: number,
  observacion: string,
  clientUpdatedAt: string,
): Promise<ActionState> {
  await requireJudge();

  if (!(value >= 0.5 && value <= 5 && (value * 10) % 5 === 0)) {
    return { error: "La calificación va de 0.5 a 5.0, de media en media." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("scores").upsert(
    {
      sheet_id: sheetId,
      criterion_id: criterionId,
      value,
      observacion,
      client_updated_at: clientUpdatedAt,
    },
    { onConflict: "sheet_id,criterion_id" },
  );

  if (error) {
    if (error.code === "42501") {
      return { error: "Esta hoja ya fue entregada." };
    }
    return { error: error.message };
  }

  return { error: null, ok: true };
}

/** Guarda la observación de un renglón. */
export async function guardarObservacion(
  sheetId: string,
  criterionId: string,
  observacion: string,
): Promise<ActionState> {
  await requireJudge();

  const supabase = await createClient();
  const { error } = await supabase
    .from("scores")
    .update({ observacion })
    .eq("sheet_id", sheetId)
    .eq("criterion_id", criterionId);

  if (error) return { error: error.message };
  return { error: null, ok: true };
}

/**
 * Entrega la hoja y la bloquea.
 *
 * Se exige que esté completa: una hoja entregada a medias falsea el total de
 * la banda, y el juez ya no puede corregirla.
 */
export async function entregarHoja(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireJudge();

  const sheetId = String(formData.get("sheet_id") ?? "");
  const observador = String(formData.get("observador") ?? "").trim();

  const supabase = await createClient();

  const { data: hoja } = await supabase
    .from("score_sheets")
    .select("id, locked_at, assignment_id")
    .eq("id", sheetId)
    .maybeSingle();

  if (!hoja) return { error: "No se encontró la hoja." };
  if (hoja.locked_at) return { error: "Esta hoja ya fue entregada." };

  const { data: asignacion } = await supabase
    .from("assignments")
    .select("template_id")
    .eq("id", hoja.assignment_id)
    .single();

  const [{ count: totalCriterios }, { count: calificados }] = await Promise.all(
    [
      supabase
        .from("sheet_criteria")
        .select("id", { count: "exact", head: true })
        .eq("template_id", asignacion!.template_id),
      supabase
        .from("scores")
        .select("id", { count: "exact", head: true })
        .eq("sheet_id", sheetId),
    ],
  );

  if ((calificados ?? 0) < (totalCriterios ?? 0)) {
    const faltan = (totalCriterios ?? 0) - (calificados ?? 0);
    return {
      error: `Faltan ${faltan} ${faltan === 1 ? "renglón" : "renglones"} por calificar.`,
    };
  }

  const { error } = await supabase
    .from("score_sheets")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      locked_at: new Date().toISOString(),
      observador,
    })
    .eq("id", sheetId);

  if (error) return { error: error.message };

  revalidatePath("/juez");
  redirect("/juez?entregada=1");
}
