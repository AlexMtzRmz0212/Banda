"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearEvento, type ActionState } from "./actions";
import { ErrorText, SubmitButton, inputClass } from "@/components/ui";

const inicial: ActionState = { error: null };

export function NuevoEvento() {
  const [state, formAction] = useActionState(crearEvento, inicial);
  const formRef = useRef<HTMLFormElement>(null);

  // Limpiar al guardar: el coordinador suele dar de alta varios seguidos.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm text-slate-300">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            required
            className={inputClass}
            placeholder="3er Encuentro Intercolegial"
          />
        </div>
        <div>
          <label
            htmlFor="event_date"
            className="mb-1.5 block text-sm text-slate-300"
          >
            Fecha
          </label>
          <input
            id="event_date"
            name="event_date"
            type="date"
            required
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="venue" className="mb-1.5 block text-sm text-slate-300">
          Sede <span className="text-slate-500">(opcional)</span>
        </label>
        <input
          id="venue"
          name="venue"
          className={inputClass}
          placeholder="Explanada del colegio"
        />
      </div>

      <fieldset className="rounded-lg border border-slate-800 p-3">
        <legend className="px-1 text-sm text-slate-300">
          Lo que pide la convocatoria
        </legend>
        <p className="mb-3 text-xs text-slate-500">
          Define el tamaño de las hojas de toques y marchas, y con ello el
          puntaje máximo del evento. No se puede cambiar una vez que empiecen a
          calificar.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="toques_count"
              className="mb-1.5 block text-sm text-slate-300"
            >
              Toques de ordenanza
            </label>
            <input
              id="toques_count"
              name="toques_count"
              type="number"
              min={1}
              max={20}
              defaultValue={3}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="marchas_count"
              className="mb-1.5 block text-sm text-slate-300"
            >
              Marchas reglamentarias
            </label>
            <input
              id="marchas_count"
              name="marchas_count"
              type="number"
              min={1}
              max={20}
              defaultValue={1}
              required
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      <ErrorText>{state.error}</ErrorText>
      <SubmitButton pendingLabel="Creando…">Crear evento</SubmitButton>
    </form>
  );
}
