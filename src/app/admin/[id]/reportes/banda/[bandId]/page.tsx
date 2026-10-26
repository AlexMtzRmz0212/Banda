import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { cargarDetalleBanda } from "@/lib/reportes";
import { formatearFecha } from "@/lib/formato";
import { BotonImprimir } from "../../boton-imprimir";

export const instant = false;

export default async function ReporteBandaPage({
  params,
}: {
  params: Promise<{ id: string; bandId: string }>;
}) {
  await requireAdmin();
  const { id, bandId } = await params;
  const supabase = await createClient();

  const [{ data: evento }, { data: banda }] = await Promise.all([
    supabase
      .from("events")
      .select("name, event_date, venue")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("bands")
      .select("name, turno, categories(name)")
      .eq("id", bandId)
      .maybeSingle(),
  ]);

  if (!evento || !banda) notFound();

  const hojas = await cargarDetalleBanda(id, bandId);
  const compilatorio = hojas
    .filter((h) => h.sumaAlTotal)
    .reduce((s, h) => s + h.total, 0);
  const comandante = hojas
    .filter((h) => !h.sumaAlTotal)
    .reduce((s, h) => s + h.total, 0);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="no-imprimir mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/${id}/reportes`}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Reportes
        </Link>
        <BotonImprimir />
      </div>

      <div className="hoja-impresa space-y-10">
        {hojas.map((h, indice) => (
          <section
            key={`${h.code}-${h.judgeSlot}`}
            className={indice > 0 ? "salto-pagina" : ""}
          >
            <header className="mb-3 text-center">
              <h1 className="text-base font-bold uppercase">{evento.name}</h1>
              <p className="text-sm font-semibold uppercase">
                {h.nombre}
                {h.judgeSlots > 1 ? ` — Juez ${h.judgeSlot}` : ""}
              </p>
            </header>

            <p className="mb-2 text-sm">
              <strong>Fecha:</strong> {formatearFecha(evento.event_date)}
              {"  "}
              <strong className="ml-4">Banda de Guerra:</strong> {banda.name}
              {"  "}
              <strong className="ml-4">Categoría:</strong>{" "}
              {banda.categories?.name ?? "—"}
              {"  "}
              <strong className="ml-4">Turno:</strong> {banda.turno}
            </p>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-10 border border-slate-700 px-2 py-1">NO</th>
                  <th className="border border-slate-700 px-2 py-1 text-left">
                    CONCEPTO A CALIFICAR
                  </th>
                  <th className="w-16 border border-slate-700 px-2 py-1">
                    TOTAL
                  </th>
                  <th className="w-48 border border-slate-700 px-2 py-1 text-left">
                    OBSERVACIONES
                  </th>
                </tr>
              </thead>
              <tbody>
                {h.renglones.map((r, i) => {
                  const nuevaSeccion =
                    r.seccion && r.seccion !== h.renglones[i - 1]?.seccion;
                  return (
                    // La clave va en el Fragment: es él quien es el elemento
                    // de la lista, no los <tr> que contiene.
                    <Fragment key={r.position}>
                      {nuevaSeccion ? (
                        <tr>
                          <th
                            colSpan={4}
                            className="border border-slate-700 bg-slate-900/60 px-2 py-1 text-left text-xs uppercase"
                          >
                            {r.seccion}
                          </th>
                        </tr>
                      ) : null}
                      <tr className="evitar-corte">
                        <td className="border border-slate-700 px-2 py-1 text-center tabular-nums">
                          {r.position}
                        </td>
                        <td className="border border-slate-700 px-2 py-1">
                          {r.label}
                        </td>
                        <td className="border border-slate-700 px-2 py-1 text-center tabular-nums">
                          {r.value ?? ""}
                        </td>
                        <td className="border border-slate-700 px-2 py-1 text-xs">
                          {r.observacion}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
                <tr className="font-bold">
                  <td
                    colSpan={2}
                    className="border border-slate-700 px-2 py-1 text-right"
                  >
                    SUMA TOTAL
                  </td>
                  <td className="border border-slate-700 px-2 py-1 text-center tabular-nums">
                    {h.total}
                  </td>
                  <td className="border border-slate-700 px-2 py-1 text-xs">
                    MÁXIMO {h.maxPoints} PTS.
                    {h.sumaAlTotal ? "" : " · No suma al total"}
                  </td>
                </tr>
              </tbody>
            </table>

            {!h.entregada ? (
              <p className="mt-2 text-xs">
                <strong>Hoja sin entregar.</strong> Lo mostrado puede estar
                incompleto.
              </p>
            ) : null}

            <div className="mt-10 flex justify-between gap-8 text-center text-xs">
              <div className="flex-1">
                <div className="border-t border-slate-600 pt-1">
                  {h.juez ?? " "}
                  <br />
                  Nombre y firma del jurado
                </div>
              </div>
              <div className="flex-1">
                <div className="border-t border-slate-600 pt-1">
                  {h.observador || " "}
                  <br />
                  Nombre y firma del observador
                </div>
              </div>
            </div>
          </section>
        ))}

        <section className="salto-pagina">
          <header className="mb-3 text-center">
            <h1 className="text-base font-bold uppercase">{evento.name}</h1>
            <p className="text-sm font-semibold uppercase">
              Resumen — {banda.name}
            </p>
          </header>

          <table className="w-full border-collapse text-sm">
            <tbody>
              {hojas.map((h) => (
                <tr key={`r-${h.code}-${h.judgeSlot}`}>
                  <td className="border border-slate-700 px-2 py-1">
                    {h.nombre}
                    {h.judgeSlots > 1 ? ` — Juez ${h.judgeSlot}` : ""}
                    {h.sumaAlTotal ? "" : " (no suma)"}
                  </td>
                  <td className="w-24 border border-slate-700 px-2 py-1 text-center tabular-nums">
                    {h.total} / {h.maxPoints}
                  </td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="border border-slate-700 px-2 py-1 text-right">
                  TOTAL COMPILATORIO
                </td>
                <td className="border border-slate-700 px-2 py-1 text-center tabular-nums">
                  {compilatorio}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-700 px-2 py-1 text-right">
                  Comandante (aparte)
                </td>
                <td className="border border-slate-700 px-2 py-1 text-center tabular-nums">
                  {comandante}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
