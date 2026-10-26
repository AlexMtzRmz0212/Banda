import { requireJudge } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { formatearFecha } from "@/lib/formato";
import { BandasAsignadas } from "./bandas-asignadas";

export const instant = false;

export default async function JuezPage({
  searchParams,
}: {
  searchParams: Promise<{ entregada?: string }>;
}) {
  const session = await requireJudge();
  const { entregada } = await searchParams;
  const supabase = await createClient();

  const { data: asignaciones } = await supabase
    .from("assignments")
    .select(
      "id, judge_slot, events(id, name, event_date, status), sheet_templates(id, name, judge_slots)",
    )
    .eq("judge_id", session.userId);

  const eventIds = [
    ...new Set((asignaciones ?? []).map((a) => a.events!.id)),
  ];

  const [{ data: bandas }, { data: hojas }] = await Promise.all([
    eventIds.length
      ? supabase
          .from("bands")
          .select("id, name, turno, event_id, categories(name)")
          .in("event_id", eventIds)
          .order("turno")
      : Promise.resolve({ data: [] }),
    supabase
      .from("score_sheets")
      .select("id, band_id, assignment_id, status, locked_at"),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">
            {session.fullName || "Juez"}
          </h1>
          <p className="text-sm text-slate-400">{session.email}</p>
        </div>
        <form action={logout}>
          <button className="shrink-0 text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
            Salir
          </button>
        </form>
      </header>

      {entregada ? (
        <p
          role="status"
          className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          Hoja entregada.
        </p>
      ) : null}

      {!asignaciones || asignaciones.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-800 px-4 py-8 text-center text-sm text-slate-500">
          Todavía no tienes hojas asignadas. El coordinador del evento te las
          asigna.
        </p>
      ) : (
        <div className="space-y-8">
          {asignaciones.map((a) => {
            const plantilla = a.sheet_templates!;
            const evento = a.events!;
            const deEsteEvento = (bandas ?? []).filter(
              (b) => b.event_id === evento.id,
            );

            return (
              <section key={a.id}>
                <h2 className="text-base font-medium">
                  {plantilla.name}
                  {plantilla.judge_slots > 1 ? (
                    <span className="ml-2 text-sm text-slate-500">
                      Juez {a.judge_slot}
                    </span>
                  ) : null}
                </h2>
                <p className="mb-3 text-sm text-slate-400">
                  {evento.name} · {formatearFecha(evento.event_date)}
                </p>

                <BandasAsignadas
                  assignmentId={a.id}
                  bandas={deEsteEvento}
                  hojas={(hojas ?? []).filter(
                    (h) => h.assignment_id === a.id,
                  )}
                />
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
