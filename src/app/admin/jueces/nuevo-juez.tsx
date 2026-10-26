"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearJuez, type JuezState } from "../actions";
import { Credenciales } from "./credenciales";
import { ErrorText, SubmitButton, inputClass } from "@/components/ui";

const inicial: JuezState = { error: null };

export function NuevoJuez() {
  const [state, formAction] = useActionState(crearJuez, inicial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <div className="space-y-3">
      <form ref={ref} action={formAction} className="flex flex-wrap gap-2">
        <input
          name="nombre"
          required
          className={inputClass + " max-w-[14rem]"}
          placeholder="Nombre del juez"
          aria-label="Nombre del juez"
        />
        <input
          name="email"
          type="email"
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={inputClass + " max-w-[16rem]"}
          placeholder="juez1@banda.local"
          aria-label="Correo del juez"
        />
        <SubmitButton pendingLabel="Creando…">Crear cuenta</SubmitButton>
      </form>

      <p className="text-xs text-slate-500">
        El correo sólo sirve para entrar: no se envía nada a esa dirección, así
        que puede ser inventado (juez1@banda.local).
      </p>

      {state.credenciales ? (
        <Credenciales credenciales={state.credenciales} />
      ) : null}

      <ErrorText>{state.error}</ErrorText>
    </div>
  );
}
