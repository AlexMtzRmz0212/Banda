"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { crearBanda, eliminarBanda, type ActionState } from "../actions";
import { ErrorText, SubmitButton, inputClass } from "@/components/ui";

const inicial: ActionState = { error: null };

type Banda = { id: string; name: string; turno: number; category_id: string };

export function Bandas({
  eventId,
  categorias,
  bandas,
}: {
  eventId: string;
  categorias: { id: string; name: string }[];
  bandas: Banda[];
}) {
  const [state, formAction] = useActionState(crearBanda, inicial);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  const nombreCategoria = (id: string) =>
    categorias.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="space-y-3">
      {bandas.length > 0 ? (
        <ol className="space-y-1.5">
          {bandas.map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2"
            >
              <span className="w-8 shrink-0 text-center text-sm text-slate-500">
                {b.turno}
              </span>
              <span className="min-w-0 flex-1 truncate">{b.name}</span>
              <span className="shrink-0 text-sm text-slate-400">
                {nombreCategoria(b.category_id)}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() => {
                    void eliminarBanda(eventId, b.id);
                  })
                }
                className="shrink-0 text-sm text-slate-500 hover:text-red-400 disabled:opacity-50"
                aria-label={`Quitar ${b.name}`}
              >
                Quitar
              </button>
            </li>
          ))}
        </ol>
      ) : null}

      <form ref={ref} action={formAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="event_id" value={eventId} />
        <input
          name="name"
          required
          className={inputClass + " max-w-xs"}
          placeholder="Banda de Guerra del colegio…"
          aria-label="Nombre de la banda"
        />
        <select
          name="category_id"
          required
          className={inputClass + " max-w-[16rem]"}
          aria-label="Categoría"
        >
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <SubmitButton pendingLabel="Agregando…">Agregar banda</SubmitButton>
      </form>

      <p className="text-xs text-slate-500">
        El turno se asigna solo, en el orden en que las agregas.
      </p>

      <ErrorText>{state.error}</ErrorText>
    </div>
  );
}
