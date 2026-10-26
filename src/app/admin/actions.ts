"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";
import { crearPlantillasDelEvento } from "@/lib/catalogo";
import { createServiceClient } from "@/lib/supabase/admin";

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

const cuenta = (campo: string) =>
  z.coerce
    .number()
    .int()
    .min(1, `Debe haber al menos ${campo}.`)
    .max(20, `Son demasiadas ${campo}.`);

const eventoSchema = z.object({
  name: z.string().trim().min(1, "Ponle nombre al evento."),
  event_date: z.string().min(1, "Elige la fecha."),
  venue: z.string().trim().default(""),
  // Los define la convocatoria y varían de un evento a otro.
  toques_count: cuenta("un toque"),
  marchas_count: cuenta("una marcha"),
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
    toques_count: formData.get("toques_count") ?? 3,
    marchas_count: formData.get("marchas_count") ?? 1,
  });

  if (!parsed.success) {
    return fail(parsed.error.issues[0].message);
  }

  const supabase = await createClient();
  const { data: evento, error } = await supabase
    .from("events")
    .insert({ ...parsed.data, owner_id: session.userId })
    .select("id")
    .single();

  if (error) return fail(mensajeDe(error));

  // Las hojas del evento se arman de inmediato: sin ellas no hay nada que
  // asignar a los jueces.
  const { error: plantillasError } = await crearPlantillasDelEvento(
    supabase,
    evento.id,
    { toques: parsed.data.toques_count, marchas: parsed.data.marchas_count },
  );

  if (plantillasError) {
    // El evento quedaría a medias, sin hojas. Más vale deshacerlo que dejar
    // al coordinador con algo que no se puede calificar.
    await supabase.from("events").delete().eq("id", evento.id);
    return fail(`No se pudieron crear las hojas del evento: ${plantillasError}`);
  }

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

// ─── Jueces ─────────────────────────────────────────────────────────────

export type JuezState = ActionState & {
  /** Se muestra una sola vez, al crear la cuenta. */
  credenciales?: { email: string; password: string };
};

/** Contraseña corta pero con entropía suficiente para dictarla de viva voz. */
function generarPassword(): string {
  return randomBytes(9).toString("base64url");
}

export async function crearJuez(
  _prev: JuezState,
  formData: FormData,
): Promise<JuezState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const nombre = String(formData.get("nombre") ?? "").trim();

  if (!email) return fail("Escribe el correo del juez.");
  if (!nombre) return fail("Escribe el nombre del juez.");

  const password = generarPassword();

  // Crear cuentas exige la clave secreta: la publicable no puede.
  const service = createServiceClient();
  const { error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // No hay servidor de correo configurado.
    user_metadata: { full_name: nombre, role: "judge" },
  });

  if (error) {
    if (/already|registrad/i.test(error.message)) {
      return fail("Ya existe una cuenta con ese correo.");
    }
    return fail(error.message);
  }

  revalidatePath("/admin", "layout");
  return { ...OK, credenciales: { email, password } };
}

// ─── Asignaciones ───────────────────────────────────────────────────────

export async function asignarJuez(
  eventId: string,
  templateId: string,
  judgeSlot: number,
  judgeId: string,
): Promise<ActionState> {
  await requireAdmin();

  const supabase = await createClient();

  // Sin juez elegido, se libera el puesto.
  if (!judgeId) {
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("event_id", eventId)
      .eq("template_id", templateId)
      .eq("judge_slot", judgeSlot);

    if (error) return fail(mensajeDe(error));
    revalidatePath(`/admin/${eventId}`);
    return OK;
  }

  const { error } = await supabase.from("assignments").upsert(
    {
      event_id: eventId,
      template_id: templateId,
      judge_slot: judgeSlot,
      judge_id: judgeId,
    },
    { onConflict: "event_id,template_id,judge_slot" },
  );

  if (error) return fail(mensajeDe(error));

  revalidatePath(`/admin/${eventId}`);
  return OK;
}
