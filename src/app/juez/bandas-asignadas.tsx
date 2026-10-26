import { abrirHoja } from "./actions";

type Banda = {
  id: string;
  name: string;
  turno: number;
  categories: { name: string } | null;
};

type Hoja = {
  id: string;
  band_id: string;
  status: string;
  locked_at: string | null;
};

/**
 * Las bandas en su orden de participación. El juez abre la que está en el
 * área y no tiene que buscarla en una lista alfabética.
 */
export function BandasAsignadas({
  assignmentId,
  bandas,
  hojas,
}: {
  assignmentId: string;
  bandas: Banda[];
  hojas: Hoja[];
}) {
  if (bandas.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">
        Este evento todavía no tiene bandas registradas.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
      {bandas.map((b) => {
        const hoja = hojas.find((h) => h.band_id === b.id);
        const entregada = Boolean(hoja?.locked_at);
        const empezada = Boolean(hoja) && !entregada;

        return (
          <li
            key={b.id}
            className="flex items-center gap-3 bg-slate-900/50 px-3 py-2.5"
          >
            <span className="w-7 shrink-0 text-center text-sm text-slate-500">
              {b.turno}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate">{b.name}</p>
              {b.categories ? (
                <p className="text-xs text-slate-500">{b.categories.name}</p>
              ) : null}
            </div>

            {entregada ? (
              <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400">
                Entregada
              </span>
            ) : empezada ? (
              <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-400">
                En curso
              </span>
            ) : null}

            <form action={abrirHoja.bind(null, assignmentId, b.id)}>
              <button className="h-9 shrink-0 rounded-lg border border-slate-700 px-3 text-sm transition-colors hover:border-sky-500 hover:text-sky-400">
                {entregada ? "Ver" : empezada ? "Continuar" : "Calificar"}
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
