import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { AdminShell, Empty, Section } from "@/components/admin-shell";
import { formatearFecha } from "@/lib/formato";
import { SHEETS } from "@/lib/sheets";
import { Categorias } from "./categorias";
import { Bandas } from "./bandas";
import { Jueces } from "./jueces";
import { Asignaciones } from "./asignaciones";

export const instant = false;

/** Orden de las hojas tal como aparecen en el PDF. */
const ORDEN = new Map(SHEETS.map((s, i) => [s.code, i]));

export default async function EventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: evento } = await supabase
    .from("events")
    .select("id, name, event_date, venue, status, toques_count, marchas_count")
    .eq("id", id)
    .maybeSingle();

  if (!evento) notFound();

  const [
    { data: categorias },
    { data: bandas },
    { data: plantillas },
    { data: jueces },
    { data: asignaciones },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("event_id", id)
      .order("name"),
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
      .from("profiles")
      .select("id, full_name")
      .eq("role", "judge")
      .order("full_name"),
    supabase
      .from("assignments")
      .select("id, template_id, judge_slot, judge_id")
      .eq("event_id", id),
  ]);

  const hojas = (plantillas ?? []).sort(
    (a, b) => (ORDEN.get(a.code) ?? 99) - (ORDEN.get(b.code) ?? 99),
  );

  const maximo = hojas
    .filter((h) => h.counts_toward_total)
    .reduce((s, h) => s + Number(h.max_points) * h.judge_slots, 0);

  const puestos = hojas.reduce((n, h) => n + h.judge_slots, 0);
  const cubiertos = (asignaciones ?? []).length;

  return (
    <AdminShell
      title={evento.name}
      subtitle={`${formatearFecha(evento.event_date)}${evento.venue ? ` · ${evento.venue}` : ""}`}
      back={{ href: "/admin", label: "Eventos" }}
    >
      <Section title="Durante el concurso">
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/${id}/tablero`}
            className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-300 transition-colors hover:bg-sky-500/20"
          >
            Abrir tablero en vivo →
          </Link>
          <Link
            href={`/admin/${id}/reportes`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm transition-colors hover:border-sky-500 hover:text-sky-400"
          >
            Reportes y sumatoria
          </Link>
        </div>
      </Section>

      <Section title="Convocatoria">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Toques", evento.toques_count],
            ["Marchas", evento.marchas_count],
            ["Puntaje máximo", `${maximo} pts`],
            ["Puestos de juez", `${cubiertos} de ${puestos}`],
          ].map(([k, v]) => (
            <div
              key={String(k)}
              className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2"
            >
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="mt-0.5 text-lg font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Categorías">
        <Categorias eventId={id} categorias={categorias ?? []} />
      </Section>

      <Section title="Bandas">
        {categorias && categorias.length > 0 ? (
          <Bandas
            eventId={id}
            categorias={categorias}
            bandas={bandas ?? []}
          />
        ) : (
          <Empty>Primero crea al menos una categoría.</Empty>
        )}
      </Section>

      <Section title="Jueces">
        <Jueces jueces={jueces ?? []} />
      </Section>

      <Section title="Asignación de hojas">
        <Asignaciones
          eventId={id}
          hojas={hojas}
          jueces={jueces ?? []}
          asignaciones={asignaciones ?? []}
        />
      </Section>
    </AdminShell>
  );
}
