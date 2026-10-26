"use client";

import { Empty } from "@/components/admin-shell";
import type { Asignacion, Banda, HojaTotal, Plantilla } from "./tablero";

type EstadoHoja = "entregada" | "en_curso" | "sin_empezar" | "sin_juez";

const COLOR: Record<EstadoHoja, string> = {
  entregada: "bg-emerald-500/80",
  en_curso: "bg-amber-500/80",
  sin_empezar: "bg-slate-800",
  sin_juez: "bg-slate-800/40 ring-1 ring-red-500/40",
};

const ETIQUETA: Record<EstadoHoja, string> = {
  entregada: "Entregada",
  en_curso: "En curso",
  sin_empezar: "Sin empezar",
  sin_juez: "Sin juez asignado",
};

/**
 * Rejilla de avance: una columna por puesto de juez, una fila por banda.
 *
 * Es la pantalla que dice, de un vistazo, qué falta para poder cerrar el
 * evento — y qué juez va atrasado mientras el concurso sigue.
 */
export function Avance({
  bandas,
  plantillas,
  asignaciones,
  hojas,
}: {
  bandas: Banda[];
  plantillas: Plantilla[];
  asignaciones: Asignacion[];
  hojas: HojaTotal[];
}) {
  if (bandas.length === 0 || plantillas.length === 0) {
    return <Empty>Falta registrar bandas o armar las hojas del evento.</Empty>;
  }

  const puestos = plantillas.flatMap((p) =>
    Array.from({ length: p.judge_slots }, (_, i) => ({
      plantilla: p,
      slot: i + 1,
      asignacion: asignaciones.find(
        (a) => a.template_id === p.id && a.judge_slot === i + 1,
      ),
    })),
  );

  const estadoDe = (
    bandId: string,
    asignacionId: string | undefined,
  ): EstadoHoja => {
    if (!asignacionId) return "sin_juez";
    const hoja = hojas.find(
      (h) => h.band_id === bandId && h.assignment_id === asignacionId,
    );
    if (!hoja) return "sin_empezar";
    return hoja.status === "submitted" ? "entregada" : "en_curso";
  };

  const totalCeldas = bandas.length * puestos.length;
  const entregadas = bandas.reduce(
    (n, b) =>
      n +
      puestos.filter((p) => estadoDe(b.id, p.asignacion?.id) === "entregada")
        .length,
    0,
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        {entregadas} de {totalCeldas} hojas entregadas
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Avance de calificación por banda y puesto de juez
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 bg-slate-900 px-3 py-2 text-left font-medium text-slate-400"
              >
                Banda
              </th>
              {puestos.map((p) => (
                <th
                  key={`${p.plantilla.id}-${p.slot}`}
                  scope="col"
                  className="bg-slate-900 px-1 py-2 text-center text-xs font-normal text-slate-500"
                  title={
                    p.plantilla.name +
                    (p.plantilla.judge_slots > 1 ? ` · Juez ${p.slot}` : "") +
                    (p.asignacion?.profiles?.full_name
                      ? ` — ${p.asignacion.profiles.full_name}`
                      : " — sin juez")
                  }
                >
                  <span className="block max-w-[3.5rem] truncate">
                    {p.plantilla.code.replace(/_/g, " ")}
                  </span>
                  {p.plantilla.judge_slots > 1 ? (
                    <span className="text-slate-600">J{p.slot}</span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bandas.map((b) => (
              <tr key={b.id} className="border-t border-slate-800">
                <th
                  scope="row"
                  className="sticky left-0 z-10 max-w-[12rem] truncate bg-slate-900/80 px-3 py-2 text-left font-normal"
                >
                  <span className="mr-2 text-slate-600 tabular-nums">
                    {b.turno}
                  </span>
                  {b.name}
                </th>
                {puestos.map((p) => {
                  const estado = estadoDe(b.id, p.asignacion?.id);
                  return (
                    <td
                      key={`${b.id}-${p.plantilla.id}-${p.slot}`}
                      className="px-1 py-2 text-center"
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded ${COLOR[estado]}`}
                        title={`${b.name} · ${p.plantilla.name}: ${ETIQUETA[estado]}`}
                      />
                      <span className="sr-only">{ETIQUETA[estado]}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-wrap gap-4 text-xs text-slate-500">
        {(Object.keys(COLOR) as EstadoHoja[]).map((e) => (
          <li key={e} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded ${COLOR[e]}`} />
            {ETIQUETA[e]}
          </li>
        ))}
      </ul>
    </div>
  );
}
