/**
 * Pruebas de la cola sin conexión, contra la base real.
 *
 *   npm run test:rls
 *
 * Lo que se verifica aquí es la promesa central del sistema: un juez califica
 * una banda entera sin señal, vuelve la conexión, y cada calificación aterriza
 * exactamente una vez. No se prueba Dexie (eso es del navegador) sino el
 * contrato del servidor en el que se apoya la cola: el upsert idempotente
 * sobre (sheet_id, criterion_id).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CONVOCATORIA_PDF, buildCatalog } from "@/lib/sheets";

config({ path: ".env.local" });

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(URL_, SECRET, { auth: { persistSession: false } });

const stamp = Date.now();
const pass = `cola-${stamp}-Aa1!`;
const emailAdmin = `admin-cola-${stamp}@example.com`;
const emailJuez = `juez-cola-${stamp}@example.com`;

const ids: Record<string, string> = {};
let juez: SupabaseClient;
let criterios: { id: string; position: number }[] = [];

/** Lo que haría la cola al vaciarse: un upsert por calificación pendiente. */
async function subir(
  cliente: SupabaseClient,
  sheetId: string,
  items: { criterionId: string; value: number; clientUpdatedAt: string }[],
) {
  for (const i of items) {
    const { error } = await cliente.from("scores").upsert(
      {
        sheet_id: sheetId,
        criterion_id: i.criterionId,
        value: i.value,
        client_updated_at: i.clientUpdatedAt,
      },
      { onConflict: "sheet_id,criterion_id" },
    );
    if (error) throw error;
  }
}

beforeAll(async () => {
  const crear = async (email: string, role: "admin" | "judge") => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: pass,
      email_confirm: true,
      user_metadata: { full_name: email, role },
    });
    if (error) throw error;
    return data.user!.id;
  };

  ids.admin = await crear(emailAdmin, "admin");
  ids.juez = await crear(emailJuez, "judge");

  const { data: evento } = await admin
    .from("events")
    .insert({
      name: `Prueba de cola ${stamp}`,
      event_date: "2026-10-22",
      owner_id: ids.admin,
      status: "live",
    })
    .select("id")
    .single();
  ids.event = evento!.id;

  const { data: categoria } = await admin
    .from("categories")
    .insert({ event_id: ids.event, name: "Única" })
    .select("id")
    .single();

  const { data: banda } = await admin
    .from("bands")
    .insert({
      event_id: ids.event,
      category_id: categoria!.id,
      name: "Banda sin señal",
      turno: 1,
    })
    .select("id")
    .single();
  ids.band = banda!.id;

  // Una hoja corta basta: lo que se prueba es la idempotencia, no el tamaño.
  const catalogo = buildCatalog(CONVOCATORIA_PDF);
  const hoja = catalogo.find((h) => h.code === "revista_corneta")!;

  const { data: plantilla } = await admin
    .from("sheet_templates")
    .insert({
      event_id: ids.event,
      code: hoja.code,
      name: hoja.name,
      judge_slots: hoja.judgeSlots,
      counts_toward_total: hoja.countsTowardTotal,
      max_points: hoja.maxPoints,
    })
    .select("id")
    .single();

  await admin.from("sheet_criteria").insert(
    hoja.criteria.map((c, i) => ({
      template_id: plantilla!.id,
      section: c.section,
      position: i + 1,
      label: c.label,
    })),
  );

  const { data: asignacion } = await admin
    .from("assignments")
    .insert({
      event_id: ids.event,
      judge_id: ids.juez,
      template_id: plantilla!.id,
      judge_slot: 1,
    })
    .select("id")
    .single();

  const { data: sheet } = await admin
    .from("score_sheets")
    .insert({
      event_id: ids.event,
      band_id: ids.band,
      assignment_id: asignacion!.id,
    })
    .select("id")
    .single();
  ids.sheet = sheet!.id;

  const { data: crits } = await admin
    .from("sheet_criteria")
    .select("id, position")
    .eq("template_id", plantilla!.id)
    .order("position");
  criterios = crits!;

  juez = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error } = await juez.auth.signInWithPassword({
    email: emailJuez,
    password: pass,
  });
  if (error) throw error;
}, 60_000);

afterAll(async () => {
  if (ids.event) await admin.from("events").delete().eq("id", ids.event);
  for (const id of [ids.juez, ids.admin]) {
    if (id) await admin.auth.admin.deleteUser(id);
  }
}, 60_000);

describe("cola sin conexión", () => {
  it("sube una hoja entera capturada sin señal", async () => {
    const capturado = criterios.map((c, i) => ({
      criterionId: c.id,
      value: [4.5, 3.5, 5, 2, 1.5, 4][i],
      clientUpdatedAt: new Date(Date.now() + i).toISOString(),
    }));

    await subir(juez, ids.sheet, capturado);

    const { data } = await admin
      .from("scores")
      .select("value")
      .eq("sheet_id", ids.sheet);

    expect(data).toHaveLength(6);
    expect(data!.reduce((s, r) => s + Number(r.value), 0)).toBe(20.5);
  });

  it("reenviar la misma cola no duplica nada", async () => {
    const capturado = criterios.map((c, i) => ({
      criterionId: c.id,
      value: [4.5, 3.5, 5, 2, 1.5, 4][i],
      clientUpdatedAt: new Date().toISOString(),
    }));

    // Dos vaciados seguidos: es lo que pasa si la respuesta se pierde y el
    // juez reconecta antes de que la cola se marque como subida.
    await subir(juez, ids.sheet, capturado);
    await subir(juez, ids.sheet, capturado);

    const { count } = await admin
      .from("scores")
      .select("id", { count: "exact", head: true })
      .eq("sheet_id", ids.sheet);

    expect(count).toBe(6);
  });

  it("una corrección posterior gana sobre lo ya subido", async () => {
    const primero = criterios[0];

    await subir(juez, ids.sheet, [
      {
        criterionId: primero.id,
        value: 1,
        clientUpdatedAt: new Date().toISOString(),
      },
    ]);

    const { data } = await admin
      .from("scores")
      .select("value")
      .eq("sheet_id", ids.sheet)
      .eq("criterion_id", primero.id)
      .single();

    expect(Number(data!.value)).toBe(1);
  });

  it("el total refleja exactamente lo capturado, sin sumas de más", async () => {
    const { data } = await admin
      .from("v_sheet_totals")
      .select("total, scored_count, criteria_count")
      .eq("sheet_id", ids.sheet)
      .single();

    // 20.5 con el primer renglón corregido de 4.5 a 1.
    expect(Number(data!.total)).toBe(17);
    expect(Number(data!.scored_count)).toBe(6);
    expect(Number(data!.criteria_count)).toBe(6);
  });

  it("la cola no puede escribir en la hoja de otro juez", async () => {
    const { data: otro } = await admin.auth.admin.createUser({
      email: `intruso-${stamp}@example.com`,
      password: pass,
      email_confirm: true,
      user_metadata: { full_name: "Intruso", role: "judge" },
    });

    const intruso = createClient(URL_, ANON, {
      auth: { persistSession: false },
    });
    await intruso.auth.signInWithPassword({
      email: `intruso-${stamp}@example.com`,
      password: pass,
    });

    const { error } = await intruso.from("scores").upsert(
      {
        sheet_id: ids.sheet,
        criterion_id: criterios[0].id,
        value: 5,
        client_updated_at: new Date().toISOString(),
      },
      { onConflict: "sheet_id,criterion_id" },
    );

    expect(error).not.toBeNull();

    // Y el valor del juez legítimo sigue intacto.
    const { data } = await admin
      .from("scores")
      .select("value")
      .eq("sheet_id", ids.sheet)
      .eq("criterion_id", criterios[0].id)
      .single();
    expect(Number(data!.value)).toBe(1);

    await admin.auth.admin.deleteUser(otro.user!.id);
  });
});
