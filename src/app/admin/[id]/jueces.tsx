"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearJuez, type JuezState } from "../actions";
import { ErrorText, SubmitButton, inputClass } from "@/components/ui";

const inicial: JuezState = { error: null };

export function Jueces({
  jueces,
}: {
  jueces: { id: string; full_name: string }[];
}) {
  const [state, formAction] = useActionState(crearJuez, inicial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <div className="space-y-3">
      {jueces.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {jueces.map((j) => (
            <li
              key={j.id}
              className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-sm"
            >
              {j.full_name || "(sin nombre)"}
            </li>
          ))}
        </ul>
      ) : null}

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
          placeholder="juez@ejemplo.com"
          aria-label="Correo del juez"
        />
        <SubmitButton pendingLabel="Creando…">Crear cuenta</SubmitButton>
      </form>

      {state.credenciales ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3"
        >
          <p className="text-sm font-medium text-emerald-300">
            Cuenta creada. Esta contraseña no se vuelve a mostrar.
          </p>
          <dl className="mt-2 grid gap-1 font-mono text-sm text-emerald-200">
            <div className="flex gap-2">
              <dt className="text-emerald-400/70">correo</dt>
              <dd>{state.credenciales.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-emerald-400/70">clave</dt>
              <dd className="font-semibold">{state.credenciales.password}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-emerald-400/70">
            Entrégasela al juez por un medio privado.
          </p>
        </div>
      ) : null}

      <ErrorText>{state.error}</ErrorText>
    </div>
  );
}
