/**
 * Arma un evento de demostración para que el cliente lo pruebe.
 *
 *   npm run demo
 *
 * Reproduce el concurso tal como lo describió el cliente: convocatoria de
 * 3 toques y 1 marcha (los 665 puntos del PDF) y siete jueces repartidos
 * 2 + 4 + 1 — dos en la bahía de revista, cuatro en la mesa de ejecución y
 * uno para comandante y orden cerrado.
 *
 * Los nombres de las bandas son inventados a propósito: no debe haber datos
 * de menores reales en un entorno de prueba.
 *
 * Vuelve a correrse sin acumular basura: borra el evento anterior y sus
 * cuentas antes de rehacerlo.
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { CONVOCATORIA_PDF, buildCatalog } from "../src/lib/sheets";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secret) {
  console.error("\n  Faltan credenciales en .env.local\n");
  process.exit(1);
}

const db = createClient(url, secret, { auth: { persistSession: false } });

const EVENTO = "Encuentro de prueba";
const DOMINIO = "demo.banda";

/** Las siete posiciones de juez, tal como las reparte el cliente. */
const JUECES = [
  {
    usuario: "revista1",
    nombre: "Revista — Cajas y Personal",
    hojas: [
      ["revista_caja", 1],
      ["revista_personal", 1],
    ],
  },
  {
    usuario: "revista2",
    nombre: "Revista — Cornetas",
    hojas: [["revista_corneta", 1]],
  },
  {
    usuario: "cajas1",
    nombre: "Ejecución Cajas — Juez 1",
    hojas: [
      ["toques_cajeros", 1],
      ["marcha_cajas", 1],
      ["rutina_cajeros", 1],
    ],
  },
  {
    usuario: "cajas2",
    nombre: "Ejecución Cajas — Juez 2",
    hojas: [
      ["toques_cajeros", 2],
      ["marcha_cajas", 2],
      ["rutina_cajeros", 2],
    ],
  },
  {
    usuario: "cornetas1",
    nombre: "Ejecución Cornetas — Juez 1",
    hojas: [
      ["toques_cornetas", 1],
      ["marcha_cornetas", 1],
      ["rutina_cornetas", 1],
    ],
  },
  {
    usuario: "cornetas2",
    nombre: "Ejecución Cornetas — Juez 2",
    hojas: [
      ["toques_cornetas", 2],
      ["marcha_cornetas", 2],
      ["rutina_cornetas", 2],
    ],
  },
  {
    usuario: "comandante",
    nombre: "Comandante y Orden Cerrado",
    hojas: [
      ["comandante", 1],
      ["orden_cerrado", 1],
    ],
  },
] as const;

const CATEGORIAS = ["Secundaria A (avanzados)", "Secundaria B (principiantes)"];

/** Nombres inventados: nada de bandas ni colegios reales en una demo. */
const BANDAS: [string, number][] = [
  ["Banda de Guerra Halcones", 0],
  ["Banda de Guerra Centauros", 0],
  ["Banda de Guerra Tigres", 1],
  ["Banda de Guerra Águilas", 1],
];

/** Contraseña corta y dictable: estas cuentas son desechables. */
function clave(): string {
  return "demo" + randomBytes(3).toString("hex");
}

async function borrarDemoAnterior() {
  const { data: previos } = await db
    .from("events")
    .select("id")
    .eq("name", EVENTO);

  for (const e of previos ?? []) {
    await db.from("events").delete().eq("id", e.id);
  }

  const { data: cuentas } = await db.auth.admin.listUsers({ perPage: 200 });
  for (const u of cuentas?.users ?? []) {
    if (u.email?.endsWith(`@${DOMINIO}`)) {
      await db.auth.admin.deleteUser(u.id);
    }
  }
}

async function main() {
  console.log(`\n  Rehaciendo «${EVENTO}»…\n`);
  await borrarDemoAnterior();

  // ── Coordinación ──────────────────────────────────────────────────────
  const claveAdmin = clave();
  const { data: admin, error: errAdmin } = await db.auth.admin.createUser({
    email: `coordinacion@${DOMINIO}`,
    password: claveAdmin,
    email_confirm: true,
    user_metadata: { full_name: "Coordinación", role: "admin" },
  });
  if (errAdmin) throw errAdmin;

  // ── Evento con la convocatoria del PDF (665 pts) ──────────────────────
  const { data: evento, error: errEvento } = await db
    .from("events")
    .insert({
      name: EVENTO,
      event_date: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
      venue: "Explanada del colegio",
      status: "live",
      owner_id: admin.user!.id,
      toques_count: CONVOCATORIA_PDF.toques,
      marchas_count: CONVOCATORIA_PDF.marchas,
    })
    .select("id")
    .single();
  if (errEvento) throw errEvento;

  // ── Hojas del evento ──────────────────────────────────────────────────
  const catalogo = buildCatalog(CONVOCATORIA_PDF);
  const { data: plantillas, error: errPlantillas } = await db
    .from("sheet_templates")
    .insert(
      catalogo.map((h) => ({
        event_id: evento.id,
        code: h.code,
        name: h.name,
        judge_slots: h.judgeSlots,
        counts_toward_total: h.countsTowardTotal,
        max_points: h.maxPoints,
      })),
    )
    .select("id, code");
  if (errPlantillas) throw errPlantillas;

  const porCodigo = new Map(plantillas.map((p) => [p.code, p.id]));

  await db.from("sheet_criteria").insert(
    catalogo.flatMap((h) =>
      h.criteria.map((c, i) => ({
        template_id: porCodigo.get(h.code)!,
        section: c.section,
        position: i + 1,
        label: c.label,
        deduction_hint: c.deductionHint ?? null,
      })),
    ),
  );

  // ── Categorías y bandas ───────────────────────────────────────────────
  const { data: categorias } = await db
    .from("categories")
    .insert(CATEGORIAS.map((name) => ({ event_id: evento.id, name })))
    .select("id");

  await db.from("bands").insert(
    BANDAS.map(([name, cat], i) => ({
      event_id: evento.id,
      category_id: categorias![cat].id,
      name,
      turno: i + 1,
    })),
  );

  // ── Jueces y sus asignaciones ─────────────────────────────────────────
  const credenciales: { nombre: string; correo: string; clave: string }[] = [];

  for (const j of JUECES) {
    const pass = clave();
    const correo = `${j.usuario}@${DOMINIO}`;

    const { data: cuenta, error } = await db.auth.admin.createUser({
      email: correo,
      password: pass,
      email_confirm: true,
      user_metadata: { full_name: j.nombre, role: "judge" },
    });
    if (error) throw error;

    await db.from("assignments").insert(
      j.hojas.map(([code, slot]) => ({
        event_id: evento.id,
        judge_id: cuenta.user!.id,
        template_id: porCodigo.get(code)!,
        judge_slot: slot,
      })),
    );

    credenciales.push({ nombre: j.nombre, correo, clave: pass });
  }

  // ── Resumen ───────────────────────────────────────────────────────────
  const { data: total } = await db
    .from("sheet_templates")
    .select("max_points, judge_slots, counts_toward_total")
    .eq("event_id", evento.id);

  const maximo = (total ?? [])
    .filter((t) => t.counts_toward_total)
    .reduce((s, t) => s + Number(t.max_points) * t.judge_slots, 0);

  console.log(`  Evento:   ${EVENTO}`);
  console.log(`  Máximo:   ${maximo} pts`);
  console.log(`  Bandas:   ${BANDAS.length}`);
  console.log(`  Puestos:  ${JUECES.reduce((n, j) => n + j.hojas.length, 0)} de 17 asignados\n`);

  console.log("  ── Coordinación (ve todo) ──");
  console.log(`  coordinacion@${DOMINIO}`.padEnd(32) + claveAdmin + "\n");

  console.log("  ── Jueces ──");
  for (const c of credenciales) {
    console.log("  " + c.correo.padEnd(32) + c.clave.padEnd(12) + c.nombre);
  }
  console.log("\n  Estas cuentas son desechables: bórralas cuando termine la prueba.\n");
}

main().catch((e) => {
  console.error("\n  Falló:", e.message ?? e, "\n");
  process.exit(1);
});
