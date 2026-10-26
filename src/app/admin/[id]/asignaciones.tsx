"use client";

import { useState, useTransition } from "react";
import { asignarJuez } from "../actions";
import { ErrorText } from "@/components/ui";

type Hoja = {
  id: string;
  code: string;
  name: string;
  judge_slots: number;
  counts_toward_total: boolean;
  max_points: number;
};

type Asignacion = {
  id: string;
  template_id: string;
  judge_slot: number;
  judge_id: string;
};

/**
 * Un renglón por puesto de juez: 17 en la convocatoria del PDF, porque seis
 * hojas se evalúan por duplicado. Cada puesto es un desplegable, de modo que
 * se ve de un vistazo cuáles quedan sin cubrir.
 */
export function Asignaciones({
  eventId,
  hojas,
  jueces,
  asignaciones,
}: {
  eventId: string;
  hojas: Hoja[];
  jueces: { id: string; full_name: string }[];
  asignaciones: Asignacion[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (hojas.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">
        Este evento no tiene hojas. Se crearon antes de que el sistema las
        generara por evento: vuelve a crear el evento.
      </p>
    );
  }

  const asignado = (templateId: string, slot: number) =>
    asignaciones.find(
      (a) => a.template_id === templateId && a.judge_slot === slot,
    )?.judge_id ?? "";

  const cambiar = (templateId: string, slot: number, judgeId: string) => {
    setError(null);
    startTransition(async () => {
      const r = await asignarJuez(eventId, templateId, slot, judgeId);
      if (r.error) setError(r.error);
    });
  };

  const puestos = hojas.flatMap((h) =>
    Array.from({ length: h.judge_slots }, (_, i) => ({ hoja: h, slot: i + 1 })),
  );

  return (
    <div className="space-y-3">
      {jueces.length === 0 ? (
        <p className="text-sm text-slate-500">
          Crea primero las cuentas de los jueces, arriba.
        </p>
      ) : null}

      <ul className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
        {puestos.map(({ hoja, slot }) => {
          const actual = asignado(hoja.id, slot);
          return (
            <li
              key={`${hoja.id}-${slot}`}
              className="flex flex-wrap items-center gap-3 bg-slate-900/50 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {hoja.name}
                  {hoja.judge_slots > 1 ? (
                    <span className="ml-2 text-slate-500">Juez {slot}</span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-500">
                  {Number(hoja.max_points)} pts
                  {hoja.counts_toward_total ? "" : " · no suma al total"}
                </p>
              </div>

              <select
                value={actual}
                disabled={pending || jueces.length === 0}
                onChange={(e) => cambiar(hoja.id, slot, e.target.value)}
                aria-label={`Juez para ${hoja.name}${hoja.judge_slots > 1 ? ` (Juez ${slot})` : ""}`}
                className={
                  "h-9 w-56 rounded-lg border bg-slate-900 px-2 text-sm outline-none focus:border-sky-500 disabled:opacity-50 " +
                  (actual
                    ? "border-slate-700 text-white"
                    : "border-amber-500/40 text-amber-400")
                }
              >
                <option value="">Sin asignar</option>
                {jueces.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.full_name || "(sin nombre)"}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>

      <ErrorText>{error}</ErrorText>
    </div>
  );
}
