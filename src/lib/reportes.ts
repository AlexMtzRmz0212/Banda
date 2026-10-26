import "server-only";

import { createClient } from "@/lib/supabase/server";
import { SHEETS } from "@/lib/sheets";

/**
 * Lectura de resultados para los reportes.
 *
 * La sumatoria, el reporte por banda y el CSV salen todos de aquí. Si cada
 * uno consultara por su cuenta, acabarían discrepando en algún detalle —
 * justo el problema que este sistema viene a resolver.
 */

/** Orden de las hojas tal como aparecen impresas en el PDF. */
const ORDEN = new Map(SHEETS.map((s, i) => [s.code, i]));

export type PuestoResultado = {
  templateId: string;
  code: string;
  nombre: string;
  judgeSlot: number;
  judgeSlots: number;
  sumaAlTotal: boolean;
  maxPoints: number;
  juez: string | null;
  /** null = esa hoja no se llenó. */
  total: number | null;
  entregada: boolean;
};

export type BandaResultado = {
  id: string;
  nombre: string;
  turno: number;
  categoria: string;
  puestos: PuestoResultado[];
  totalCompilatorio: number;
  totalComandante: number;
  hojasEntregadas: number;
  hojasTotales: number;
};

export type EventoResultados = {
  evento: {
    id: string;
    nombre: string;
    fecha: string;
    sede: string;
    estado: string;
  };
  maximo: number;
  /** Los puestos del evento, en orden del PDF: encabezados de la sumatoria. */
  puestos: { templateId: string; code: string; nombre: string; judgeSlot: number; judgeSlots: number; maxPoints: number; sumaAlTotal: boolean }[];
  bandas: BandaResultado[];
};

export async function cargarResultados(
  eventId: string,
): Promise<EventoResultados | null> {
  const supabase = await createClient();

  const { data: evento } = await supabase
    .from("events")
    .select("id, name, event_date, venue, status")
    .eq("id", eventId)
    .maybeSingle();

  if (!evento) return null;

  const [
    { data: plantillas },
    { data: bandas },
    { data: asignaciones },
    { data: hojas },
    { data: totales },
  ] = await Promise.all([
    supabase
      .from("sheet_templates")
      .select("id, code, name, judge_slots, counts_toward_total, max_points")
      .eq("event_id", eventId),
    supabase
      .from("bands")
      .select("id, name, turno, categories(name)")
      .eq("event_id", eventId)
      .order("turno"),
    supabase
      .from("assignments")
      .select("id, template_id, judge_slot, profiles(full_name)")
      .eq("event_id", eventId),
    supabase
      .from("v_sheet_totals")
      .select("band_id, assignment_id, status, total")
      .eq("event_id", eventId),
    supabase
      .from("v_band_totals")
      .select("band_id, total_compilatorio, total_comandante, sheets_submitted")
      .eq("event_id", eventId),
  ]);

  const ordenadas = (plantillas ?? []).sort(
    (a, b) => (ORDEN.get(a.code) ?? 99) - (ORDEN.get(b.code) ?? 99),
  );

  const puestos = ordenadas.flatMap((p) =>
    Array.from({ length: p.judge_slots }, (_, i) => ({
      templateId: p.id,
      code: p.code,
      nombre: p.name,
      judgeSlot: i + 1,
      judgeSlots: p.judge_slots,
      maxPoints: Number(p.max_points),
      sumaAlTotal: p.counts_toward_total,
    })),
  );

  const maximo = puestos
    .filter((p) => p.sumaAlTotal)
    .reduce((s, p) => s + p.maxPoints, 0);

  const resultados: BandaResultado[] = (bandas ?? []).map((b) => {
    const total = (totales ?? []).find((t) => t.band_id === b.id);

    const puestosDeBanda: PuestoResultado[] = puestos.map((p) => {
      const asignacion = (asignaciones ?? []).find(
        (a) => a.template_id === p.templateId && a.judge_slot === p.judgeSlot,
      );
      const hoja = asignacion
        ? (hojas ?? []).find(
            (h) => h.band_id === b.id && h.assignment_id === asignacion.id,
          )
        : undefined;

      return {
        ...p,
        juez: asignacion?.profiles?.full_name ?? null,
        total: hoja ? Number(hoja.total) : null,
        entregada: hoja?.status === "submitted",
      };
    });

    return {
      id: b.id,
      nombre: b.name,
      turno: b.turno,
      categoria: b.categories?.name ?? "",
      puestos: puestosDeBanda,
      totalCompilatorio: Number(total?.total_compilatorio ?? 0),
      totalComandante: Number(total?.total_comandante ?? 0),
      hojasEntregadas: Number(total?.sheets_submitted ?? 0),
      hojasTotales: puestos.length,
    };
  });

  return {
    evento: {
      id: evento.id,
      nombre: evento.name,
      fecha: evento.event_date,
      sede: evento.venue,
      estado: evento.status,
    },
    maximo,
    puestos,
    bandas: resultados,
  };
}

/** Detalle renglón por renglón de una banda, para el reporte en papel. */
export type RenglonDetalle = {
  seccion: string | null;
  position: number;
  label: string;
  value: number | null;
  observacion: string;
};

export type HojaDetalle = {
  code: string;
  nombre: string;
  judgeSlot: number;
  judgeSlots: number;
  sumaAlTotal: boolean;
  maxPoints: number;
  juez: string | null;
  observador: string;
  entregada: boolean;
  renglones: RenglonDetalle[];
  total: number;
};

export async function cargarDetalleBanda(
  eventId: string,
  bandId: string,
): Promise<HojaDetalle[]> {
  const supabase = await createClient();

  const [{ data: plantillas }, { data: asignaciones }, { data: hojas }] =
    await Promise.all([
      supabase
        .from("sheet_templates")
        .select(
          "id, code, name, judge_slots, counts_toward_total, max_points, sheet_criteria(id, section, position, label)",
        )
        .eq("event_id", eventId),
      supabase
        .from("assignments")
        .select("id, template_id, judge_slot, profiles(full_name)")
        .eq("event_id", eventId),
      supabase
        .from("score_sheets")
        .select(
          "id, assignment_id, status, observador, scores(criterion_id, value, observacion)",
        )
        .eq("band_id", bandId),
    ]);

  const ordenadas = (plantillas ?? []).sort(
    (a, b) => (ORDEN.get(a.code) ?? 99) - (ORDEN.get(b.code) ?? 99),
  );

  return ordenadas.flatMap((p) =>
    Array.from({ length: p.judge_slots }, (_, i) => {
      const slot = i + 1;
      const asignacion = (asignaciones ?? []).find(
        (a) => a.template_id === p.id && a.judge_slot === slot,
      );
      const hoja = asignacion
        ? (hojas ?? []).find((h) => h.assignment_id === asignacion.id)
        : undefined;

      const criterios = [...(p.sheet_criteria ?? [])].sort(
        (a, b) => a.position - b.position,
      );

      const renglones: RenglonDetalle[] = criterios.map((c) => {
        const score = hoja?.scores?.find((s) => s.criterion_id === c.id);
        return {
          seccion: c.section,
          position: c.position,
          label: c.label,
          value: score ? Number(score.value) : null,
          observacion: score?.observacion ?? "",
        };
      });

      return {
        code: p.code,
        nombre: p.name,
        judgeSlot: slot,
        judgeSlots: p.judge_slots,
        sumaAlTotal: p.counts_toward_total,
        maxPoints: Number(p.max_points),
        juez: asignacion?.profiles?.full_name ?? null,
        observador: hoja?.observador ?? "",
        entregada: hoja?.status === "submitted",
        renglones,
        total: renglones.reduce((s, r) => s + (r.value ?? 0), 0),
      };
    }),
  );
}
