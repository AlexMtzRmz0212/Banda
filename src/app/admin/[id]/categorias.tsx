"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearCategoria, type ActionState } from "../actions";
import { ErrorText, SubmitButton, inputClass } from "@/components/ui";

const inicial: ActionState = { error: null };

export function Categorias({
  eventId,
  categorias,
}: {
  eventId: string;
  categorias: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState(crearCategoria, inicial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <div className="space-y-3">
      {categorias.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {categorias.map((c) => (
            <li
              key={c.id}
              className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-sm"
            >
              {c.name}
            </li>
          ))}
        </ul>
      ) : null}

      <form ref={ref} action={formAction} className="flex gap-2">
        <input type="hidden" name="event_id" value={eventId} />
        <input
          name="name"
          required
          className={inputClass + " max-w-xs"}
          placeholder="Secundaria A (avanzados)"
          aria-label="Nombre de la categoría"
        />
        <SubmitButton pendingLabel="Agregando…">Agregar</SubmitButton>
      </form>

      <ErrorText>{state.error}</ErrorText>
    </div>
  );
}
