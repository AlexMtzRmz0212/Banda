"use client";

import { Empty } from "@/components/admin-shell";
import type { Banda, TotalBanda } from "./tablero";

/**
 * Posiciones por categoría.
 *
 * Se compite dentro de la categoría, no entre todas: una primaria
 * principiante y un bachillerato avanzado no comparten tabla.
 *
 * El desempate NO se resuelve aquí. El cliente lo decide por criterios de la
 * convocatoria, ajenos a la aplicación, así que dos bandas empatadas se
 * muestran con el mismo lugar y marcadas, en lugar de inventar un orden.
 */
export function Posiciones({
  categorias,
  bandas,
  totales,
  maximo,
}: {
  categorias: { id: string; name: string }[];
  bandas: Banda[];
  totales: TotalBanda[];
  maximo: number;
}) {
  if (bandas.length === 0) {
    return <Empty>Este evento todavía no tiene bandas.</Empty>;
  }

  const totalDe = (bandId: string) =>
    totales.find((t) => t.band_id === bandId);

  return (
    <div className="space-y-6">
      {categorias.map((cat) => {
        const deLaCategoria = bandas
          .filter((b) => b.category_id === cat.id)
          .map((b) => ({ banda: b, total: totalDe(b.id) }))
          .sort(
            (a, b) =>
              Number(b.total?.total_compilatorio ?? 0) -
              Number(a.total?.total_compilatorio ?? 0),
          );

        if (deLaCategoria.length === 0) return null;

        // Mismo puntaje, mismo lugar.
        let lugar = 0;
        let previo: number | null = null;

        return (
          <div key={cat.id}>
            <h3 className="mb-2 text-sm font-medium text-slate-300">
              {cat.name}
            </h3>
            <ol className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
              {deLaCategoria.map(({ banda, total }, i) => {
                const puntos = Number(total?.total_compilatorio ?? 0);
                if (previo === null || puntos !== previo) lugar = i + 1;
                const empatada =
                  deLaCategoria.filter(
                    (o) => Number(o.total?.total_compilatorio ?? 0) === puntos,
                  ).length > 1;
                previo = puntos;

                return (
                  <li
                    key={banda.id}
                    className="flex items-center gap-3 bg-slate-900/50 px-3 py-2.5"
                  >
                    <span
                      className={
                        "w-7 shrink-0 text-center text-sm font-semibold tabular-nums " +
                        (lugar === 1 ? "text-amber-400" : "text-slate-500")
                      }
                    >
                      {lugar}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate">{banda.name}</p>
                      <p className="text-xs text-slate-500">
                        {total?.sheets_submitted ?? 0} hojas entregadas
                        {empatada ? " · empate" : ""}
                      </p>
                    </div>

                    {Number(total?.total_comandante ?? 0) > 0 ? (
                      <span
                        className="shrink-0 text-xs text-slate-500"
                        title="Comandante, no suma al total de la banda"
                      >
                        Cmte {Number(total!.total_comandante)}
                      </span>
                    ) : null}

                    <span className="shrink-0 text-right tabular-nums">
                      <span className="text-lg font-semibold">{puntos}</span>
                      <span className="text-sm text-slate-500"> / {maximo}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
