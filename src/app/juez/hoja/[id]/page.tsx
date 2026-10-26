import Link from "next/link";
import { notFound } from "next/navigation";
import { requireJudge } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { Hoja } from "./hoja";

export const instant = false;

export default async function HojaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireJudge();
  const { id } = await params;
  const supabase = await createClient();

  // El RLS ya filtra: si la hoja no es de este juez, no llega nada.
  const { data: hoja } = await supabase
    .from("score_sheets")
    .select(
      "id, status, locked_at, observador, bands(name, turno, categories(name)), assignments(judge_slot, sheet_templates(id, name, judge_slots, max_points))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!hoja) notFound();

  const plantilla = hoja.assignments!.sheet_templates!;

  const [{ data: criterios }, { data: calificaciones }] = await Promise.all([
    supabase
      .from("sheet_criteria")
      .select("id, section, position, label, deduction_hint")
      .eq("template_id", plantilla.id)
      .order("position"),
    supabase
      .from("scores")
      .select("criterion_id, value, observacion")
      .eq("sheet_id", id),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-6">
        <Link
          href="/juez"
          className="mb-1 inline-block text-sm text-slate-400 hover:text-slate-200"
        >
          ← Mis hojas
        </Link>
        <h1 className="text-lg font-semibold">
          {hoja.bands!.name}
          <span className="ml-2 text-sm font-normal text-slate-500">
            turno {hoja.bands!.turno}
          </span>
        </h1>
        <p className="text-sm text-slate-400">
          {plantilla.name}
          {plantilla.judge_slots > 1
            ? ` · Juez ${hoja.assignments!.judge_slot}`
            : ""}
          {hoja.bands!.categories ? ` · ${hoja.bands!.categories.name}` : ""}
        </p>
      </header>

      <Hoja
        sheetId={hoja.id}
        bloqueada={Boolean(hoja.locked_at)}
        observador={hoja.observador}
        maxPoints={Number(plantilla.max_points)}
        criterios={criterios ?? []}
        calificaciones={calificaciones ?? []}
      />
    </main>
  );
}
