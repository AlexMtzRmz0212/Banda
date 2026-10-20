"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";

/**
 * Server Actions del panel de administración.
 *
 * La documentación de Next advierte que una Server Action debe tratarse como
 * un endpoint público: cualquiera puede invocarla. Por eso cada una llama a
 * requireAdmin() por su cuenta, sin confiar en que la pantalla que la disparó
 * ya haya comprobado el rol. Y por debajo, el RLS vuelve a comprobarlo.
 */

export type ActionState = { error: string | null; ok?: boolean };

const OK: ActionState = { error: null, ok: true };

function fail(error: string): ActionState {
  return { error };
}

/** Traduce los errores de Postgres a algo que el coordinador entienda. */
function mensajeDe(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "Ya existe un registro con ese nombre.";
  if (error.code === "42501") return "No tienes permiso para hacer eso.";
  return error.message;
}

// ─── Eventos ────────────────────────────────────────────────────────────

const eventoSchema = z.object({
  name: z.string().trim().min(1, "Ponle nombre al evento."),
  event_date: z.string().min(1, "Elige la fecha."),
  venue: z.string().trim().default(""),
});

export async function crearEvento(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = eventoSchema.safeParse({
    name: formData.get("name"),
    event_date: formData.get("event_date"),
    venue: formData.get("venue") ?? "",
  });

  if (!parsed.success) {
    return fail(parsed.error.issues[0].message);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .insert({ ...parsed.data, owner_id: session.userId });

  if (error) return fail(mensajeDe(error));

  revalidatePath("/admin");
  return OK;
}

const estadoSchema = z.enum(["draft", "live", "closed"]);

export async function cambiarEstadoEvento(
  eventId: string,
  estado: string,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = estadoSchema.safeParse(estado);
  if (!parsed.success) return fail("Estado no válido.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ status: parsed.data })
    .eq("id", eventId);

  if (error) return fail(mensajeDe(error));

  revalidatePath("/admin");
  revalidatePath(`/admin/${eventId}`);
  return OK;
}

// ─── Categorías ─────────────────────────────────────────────────────────

export async function crearCategoria(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return fail("Ponle nombre a la categoría.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .insert({ event_id: eventId, name });

  if (error) return fail(mensajeDe(error));

  revalidatePath(`/admin/${eventId}`);
  return OK;
}

// ─── Bandas ─────────────────────────────────────────────────────────────

export async function crearBanda(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const eventId = String(formData.get("event_id") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return fail("Ponle nombre a la banda.");
  if (!categoryId) return fail("Elige una categoría.");

  const supabase = await createClient();

  // El turno es el orden de participación: se asigna el siguiente libre.
  const { data: ultima } = await supabase
    .from("bands")
    .select("turno")
    .eq("event_id", eventId)
    .order("turno", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("bands").insert({
    event_id: eventId,
    category_id: categoryId,
    name,
    turno: (ultima?.turno ?? 0) + 1,
  });

  if (error) return fail(mensajeDe(error));

  revalidatePath(`/admin/${eventId}`);
  return OK;
}

export async function eliminarBanda(
  eventId: string,
  bandId: string,
): Promise<ActionState> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("bands").delete().eq("id", bandId);

  if (error) return fail(mensajeDe(error));

  revalidatePath(`/admin/${eventId}`);
  return OK;
}
