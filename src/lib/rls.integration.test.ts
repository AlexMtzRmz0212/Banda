/**
 * Pruebas de integración del RLS — corren contra la base real.
 *
 *   npm run test:rls
 *
 * Verifican la garantía central del sistema: un juez no puede leer ni alterar
 * las calificaciones de otro juez, y la base lo impide aunque la petición no
 * venga de nuestra interfaz. Por eso se hacen con la clave publicable (la que
 * viaja al navegador), nunca con la secreta.
 *
 * Se excluyen de `npm test` porque necesitan red y credenciales.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CONVOCATORIA_PDF, buildCatalog } from "./sheets";

config({ path: ".env.local" });

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Cliente con permisos totales: sólo para montar y desmontar el escenario. */
const admin = createClient(URL_, SECRET, { auth: { persistSession: false } });

const stamp = Date.now();
const pass = `prueba-${stamp}-Aa1!`;
const emails = {
  admin: `admin-${stamp}@example.com`,
  jueza: `juez-a-${stamp}@example.com`,
  juezb: `juez-b-${stamp}@example.com`,
};

const ids: Record<string, string> = {};
let clientA: SupabaseClient;
let sheetA: string;
let sheetB: string;
let criterionA: string;
let criterionB: string;

async function crearUsuario(email: string, role: "admin" | "judge") {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: pass,
    email_confirm: true,
    user_metadata: { full_name: email.split("@")[0], role },
  });
  if (error) throw error;
  return data.user!.id;
}

/** Cliente autenticado como un juez: respeta RLS, igual que el navegador. */
async function comoJuez(email: string) {
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: pass });
  if (error) throw error;
  return c;
}

beforeAll(async () => {
  ids.admin = await crearUsuario(emails.admin, "admin");
  ids.jueza = await crearUsuario(emails.jueza, "judge");
  ids.juezb = await crearUsuario(emails.juezb, "judge");

  const { data: evento } = await admin
    .from("events")
    .insert({
      name: `Evento de prueba ${stamp}`,
      event_date: "2026-10-07",
      owner_id: ids.admin,
      status: "live",
    })
    .select("id")
    .single();
  ids.event = evento!.id;

  const { data: categoria } = await admin
    .from("categories")
    .insert({ event_id: ids.event, name: "Juvenil" })
    .select("id")
    .single();

  const { data: banda } = await admin
    .from("bands")
    .insert({
      event_id: ids.event,
      category_id: categoria!.id,
      name: "Banda de prueba",
      turno: 1,
    })
    .select("id")
    .single();
  ids.band = banda!.id;

  // Las hojas son del evento, no del catálogo: la llave compuesta de
  // assignments (template_id, event_id) rechaza una plantilla ajena.
  const catalogo = buildCatalog(CONVOCATORIA_PDF);
  const { data: plantillas, error: plantillasError } = await admin
    .from("sheet_templates")
    .insert(
      catalogo.map((h) => ({
        event_id: ids.event,
        code: h.code,
        name: h.name,
        judge_slots: h.judgeSlots,
        counts_toward_total: h.countsTowardTotal,
        max_points: h.maxPoints,
      })),
    )
    .select("id, code");
  if (plantillasError) throw plantillasError;

  const tplA = plantillas!.find((t) => t.code === "revista_personal")!;
  const tplB = plantillas!.find((t) => t.code === "orden_cerrado")!;

  // Criterios sólo de las dos hojas que usa la prueba.
  for (const [tpl, code] of [
    [tplA, "revista_personal"],
    [tplB, "orden_cerrado"],
  ] as const) {
    const hoja = catalogo.find((h) => h.code === code)!;
    const { error } = await admin.from("sheet_criteria").insert(
      hoja.criteria.map((c, i) => ({
        template_id: tpl.id,
        section: c.section,
        position: i + 1,
        label: c.label,
      })),
    );
    if (error) throw error;
  }

  const { data: asignaciones } = await admin
    .from("assignments")
    .insert([
      { event_id: ids.event, judge_id: ids.jueza, template_id: tplA.id, judge_slot: 1 },
      { event_id: ids.event, judge_id: ids.juezb, template_id: tplB.id, judge_slot: 1 },
    ])
    .select("id, judge_id");

  const asigA = asignaciones!.find((a) => a.judge_id === ids.jueza)!;
  const asigB = asignaciones!.find((a) => a.judge_id === ids.juezb)!;

  const { data: hojas } = await admin
    .from("score_sheets")
    .insert([
      { event_id: ids.event, band_id: ids.band, assignment_id: asigA.id },
      { event_id: ids.event, band_id: ids.band, assignment_id: asigB.id },
    ])
    .select("id, assignment_id");

  sheetA = hojas!.find((h) => h.assignment_id === asigA.id)!.id;
  sheetB = hojas!.find((h) => h.assignment_id === asigB.id)!.id;

  const { data: critA } = await admin
    .from("sheet_criteria")
    .select("id")
    .eq("template_id", tplA.id)
    .eq("position", 1)
    .single();
  criterionA = critA!.id;

  const { data: critB } = await admin
    .from("sheet_criteria")
    .select("id")
    .eq("template_id", tplB.id)
    .eq("position", 1)
    .single();
  criterionB = critB!.id;

  // El juez B deja una calificación que el juez A no debe poder ver.
  await admin
    .from("scores")
    .insert({ sheet_id: sheetB, criterion_id: criterionB, value: 4.5 });

  clientA = await comoJuez(emails.jueza);
}, 60_000);

afterAll(async () => {
  if (ids.event) await admin.from("events").delete().eq("id", ids.event);
  for (const id of [ids.jueza, ids.juezb, ids.admin]) {
    if (id) await admin.auth.admin.deleteUser(id);
  }
}, 60_000);

describe("lo que el juez SÍ puede hacer en su hoja", () => {
  it("lee su propia hoja", async () => {
    const { data } = await clientA.from("score_sheets").select("id").eq("id", sheetA);
    expect(data).toHaveLength(1);
  });

  it("captura una calificación", async () => {
    const { error } = await clientA
      .from("scores")
      .insert({ sheet_id: sheetA, criterion_id: criterionA, value: 3.5 });
    expect(error).toBeNull();
  });

  it("corrige lo que capturó", async () => {
    const { error } = await clientA
      .from("scores")
      .update({ value: 5.0 })
      .eq("sheet_id", sheetA)
      .eq("criterion_id", criterionA);
    expect(error).toBeNull();

    const { data } = await clientA
      .from("scores")
      .select("value")
      .eq("sheet_id", sheetA)
      .single();
    expect(Number(data!.value)).toBe(5.0);
  });

  it("lee el catálogo de criterios para pintar su hoja", async () => {
    const { data } = await clientA.from("sheet_criteria").select("id").limit(5);
    expect(data!.length).toBeGreaterThan(0);
  });
});

describe("lo que el juez NO puede hacer con la hoja ajena", () => {
  it("no ve las calificaciones del otro juez", async () => {
    const { data, error } = await clientA
      .from("scores")
      .select("id, value")
      .eq("sheet_id", sheetB);
    // RLS filtra en silencio: no es un error, simplemente no hay filas.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("no ve la hoja del otro juez", async () => {
    const { data } = await clientA.from("score_sheets").select("id").eq("id", sheetB);
    expect(data).toEqual([]);
  });

  it("no puede capturar en la hoja del otro juez", async () => {
    const { error } = await clientA
      .from("scores")
      .insert({ sheet_id: sheetB, criterion_id: criterionB, value: 1.0 });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501"); // insufficient_privilege
  });

  it("no puede alterar las calificaciones del otro juez", async () => {
    await clientA
      .from("scores")
      .update({ value: 0.5 })
      .eq("sheet_id", sheetB);

    // Confirmado con la clave secreta: el valor del juez B sigue intacto.
    const { data } = await admin
      .from("scores")
      .select("value")
      .eq("sheet_id", sheetB)
      .single();
    expect(Number(data!.value)).toBe(4.5);
  });

  it("no ve las asignaciones de otros jueces", async () => {
    const { data } = await clientA.from("assignments").select("judge_id");
    expect(data!.every((a) => a.judge_id === ids.jueza)).toBe(true);
  });
});

describe("integridad de las calificaciones", () => {
  it("rechaza valores fuera de la escala de 0.5", async () => {
    const { error } = await clientA
      .from("scores")
      .update({ value: 3.3 })
      .eq("sheet_id", sheetA)
      .eq("criterion_id", criterionA);
    expect(error).not.toBeNull(); // viola el CHECK
  });

  it("rechaza valores arriba de 5.0", async () => {
    const { error } = await clientA
      .from("scores")
      .update({ value: 6.0 })
      .eq("sheet_id", sheetA)
      .eq("criterion_id", criterionA);
    expect(error).not.toBeNull();
  });

  it("nadie borra calificaciones", async () => {
    await clientA.from("scores").delete().eq("sheet_id", sheetA);
    const { data } = await admin.from("scores").select("id").eq("sheet_id", sheetA);
    expect(data).toHaveLength(1);
  });

  it("una banda no puede tener dos calificaciones del mismo criterio", async () => {
    const { error } = await clientA
      .from("scores")
      .insert({ sheet_id: sheetA, criterion_id: criterionA, value: 2.0 });
    expect(error!.code).toBe("23505"); // unique_violation — base del modo sin conexión
  });
});

describe("hoja entregada y bloqueada", () => {
  beforeAll(async () => {
    // La entrega se hace COMO EL JUEZ, no con la clave secreta: usar la clave
    // secreta aquí saltaba el RLS y escondió que la política de entrega era
    // imposible de cumplir (ver migración 0004).
    const { error } = await clientA
      .from("score_sheets")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        locked_at: new Date().toISOString(),
      })
      .eq("id", sheetA);

    expect(error).toBeNull();

    // Un UPDATE que no alcanza ningún renglón tampoco es un error: hay que
    // confirmar que de verdad quedó bloqueada.
    const { data } = await admin
      .from("score_sheets")
      .select("status, locked_at")
      .eq("id", sheetA)
      .single();

    expect(data!.status).toBe("submitted");
    expect(data!.locked_at).not.toBeNull();
  });

  it("el juez no puede reabrir lo que entregó", async () => {
    await clientA
      .from("score_sheets")
      .update({ status: "draft", locked_at: null })
      .eq("id", sheetA);

    const { data } = await admin
      .from("score_sheets")
      .select("status, locked_at")
      .eq("id", sheetA)
      .single();

    expect(data!.status).toBe("submitted");
    expect(data!.locked_at).not.toBeNull();
  });

  it("el juez sigue viendo lo que entregó", async () => {
    const { data } = await clientA.from("scores").select("value").eq("sheet_id", sheetA);
    expect(data).toHaveLength(1);
  });

  it("pero ya no puede modificarlo", async () => {
    await clientA
      .from("scores")
      .update({ value: 0.5 })
      .eq("sheet_id", sheetA)
      .eq("criterion_id", criterionA);

    const { data } = await admin
      .from("scores")
      .select("value")
      .eq("sheet_id", sheetA)
      .single();
    expect(Number(data!.value)).toBe(5.0); // intacto
  });

  it("ni capturar criterios nuevos", async () => {
    // Otro criterio de la MISMA hoja, no uno cualquiera de la base.
    const { data: deA } = await admin
      .from("sheet_criteria")
      .select("template_id")
      .eq("id", criterionA)
      .single();

    const { data: otro } = await admin
      .from("sheet_criteria")
      .select("id")
      .eq("template_id", deA!.template_id)
      .eq("position", 2)
      .single();

    const { error } = await clientA
      .from("scores")
      .insert({ sheet_id: sheetA, criterion_id: otro!.id, value: 3.0 });
    expect(error).not.toBeNull();
  });
});

describe("totales calculados", () => {
  it("v_band_totals suma las calificaciones de la banda", async () => {
    const { data } = await admin
      .from("v_band_totals")
      .select("total_compilatorio, total_comandante")
      .eq("band_id", ids.band)
      .single();
    // 5.0 del juez A + 4.5 del juez B
    expect(Number(data!.total_compilatorio)).toBe(9.5);
    expect(Number(data!.total_comandante)).toBe(0);
  });
});
