import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin-shell";
import { formatearFecha } from "@/lib/formato";
import { SHEETS } from "@/lib/sheets";
import { Tablero } from "./tablero";

export const instant = false;

/** Orden de las hojas tal como aparecen en el PDF. */
const ORDEN = new Map(SHEETS.map((s, i) => [s.code, i]));

export default async function TableroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: evento } = await supabase
    .from("events")
    .select("id, name, event_date, venue, status")
    .eq("id", id)
    .maybeSingle();

  if (!evento) notFound();

  const [
    { data: categorias },
    { data: bandas },
    { data: plantillas },
    { data: asignaciones },
    { data: totales },
    { data: hojas },
  ] = await Promise.all([
    supabase.from("categories").select("id, name").eq("event_id", id),
    supabase
      .from("bands")
      .select("id, name, turno, category_id")
      .eq("event_id", id)
      .order("turno"),
    supabase
      .from("sheet_templates")
      .select("id, code, name, judge_slots, counts_toward_total, max_points")
      .eq("event_id", id),
    supabase
      .from("assignments")
      .select("id, template_id, judge_slot, judge_id, profiles(full_name)")
      .eq("event_id", id),
    supabase
      .from("v_band_totals")
      .select(
        "band_id, total_compilatorio, total_comandante, sheets_submitted, sheets_started",
      )
      .eq("event_id", id),
    supabase
      .from("v_sheet_totals")
      .select("sheet_id, band_id, assignment_id, status, total")
      .eq("event_id", id),
  ]);

  const ordenadas = (plantillas ?? []).sort(
    (a, b) => (ORDEN.get(a.code) ?? 99) - (ORDEN.get(b.code) ?? 99),
  );

  const maximo = ordenadas
    .filter((h) => h.counts_toward_total)
    .reduce((s, h) => s + Number(h.max_points) * h.judge_slots, 0);

  return (
    <AdminShell
      title={evento.name}
      subtitle={`Tablero en vivo · ${formatearFecha(evento.event_date)}`}
      back={{ href: `/admin/${id}`, label: "Configuración del evento" }}
    >
      <Tablero
        eventId={id}
        maximo={maximo}
        categorias={categorias ?? []}
        bandas={bandas ?? []}
        plantillas={ordenadas}
        asignaciones={asignaciones ?? []}
        totalesIniciales={totales ?? []}
        hojasIniciales={hojas ?? []}
      />
    </AdminShell>
  );
}
