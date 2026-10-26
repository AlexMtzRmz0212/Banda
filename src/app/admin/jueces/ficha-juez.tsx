"use client";

import { useActionState, useState, useTransition } from "react";
import {
  eliminarJuez,
  reiniciarPassword,
  renombrarJuez,
  type ActionState,
  type JuezState,
} from "../actions";
import { Credenciales } from "./credenciales";
import { ErrorText, SubmitButton, inputClass } from "@/components/ui";

const inicialReset: JuezState = { error: null };
const inicialNombre: ActionState = { error: null };

export function FichaJuez({
  juez,
}: {
  juez: { id: string; nombre: string; email: string };
}) {
  const [reset, resetAction] = useActionState(reiniciarPassword, inicialReset);
  const [nombre, nombreAction] = useActionState(
    renombrarJuez,
    inicialNombre,
  );
  const [editando, setEditando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const borrar = () => {
    setErrorBorrar(null);
    startTransition(async () => {
      const r = await eliminarJuez(juez.id);
      if (r.error) setErrorBorrar(r.error);
      else setBorrando(false);
    });
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          {editando ? (
            <form
              action={nombreAction}
              className="flex gap-2"
              onSubmit={() => setEditando(false)}
            >
              <input type="hidden" name="judge_id" value={juez.id} />
              <input
                name="nombre"
                defaultValue={juez.nombre}
                autoFocus
                required
                aria-label="Nombre del juez"
                className={inputClass + " max-w-xs"}
              />
              <SubmitButton pendingLabel="Guardando…">Guardar</SubmitButton>
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="text-sm text-slate-500 hover:text-slate-300"
              >
                Cancelar
              </button>
            </form>
          ) : (
            <>
              <p className="truncate font-medium">
                {juez.nombre || "(sin nombre)"}
              </p>
              <p className="truncate text-sm text-slate-500">{juez.email}</p>
            </>
          )}
        </div>

        {!editando ? (
          <div className="flex shrink-0 items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="text-slate-400 hover:text-slate-200"
            >
              Renombrar
            </button>

            <form action={resetAction}>
              <input type="hidden" name="judge_id" value={juez.id} />
              <input type="hidden" name="email" value={juez.email} />
              <SubmitButton
                pendingLabel="Generando…"
                className="!bg-transparent !px-0 !text-slate-400 hover:!text-sky-400"
              >
                Nueva contraseña
              </SubmitButton>
            </form>

            <button
              type="button"
              onClick={() => setBorrando(true)}
              disabled={pendiente}
              className="text-slate-500 hover:text-red-400 disabled:opacity-50"
            >
              Borrar
            </button>
          </div>
        ) : null}
      </div>

      <ErrorText>{nombre.error}</ErrorText>
      <ErrorText>{reset.error}</ErrorText>
      <ErrorText>{errorBorrar}</ErrorText>

      {reset.credenciales ? (
        <div className="mt-3">
          <Credenciales credenciales={reset.credenciales} />
        </div>
      ) : null}

      {borrando ? (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm">
            ¿Borrar la cuenta de{" "}
            <strong>{juez.nombre || juez.email}</strong>? No se puede deshacer.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={borrar}
              disabled={pendiente}
              className="h-9 rounded-lg bg-red-500 px-3 text-sm font-medium text-white hover:bg-red-400 disabled:opacity-50"
            >
              {pendiente ? "Borrando…" : "Sí, borrar"}
            </button>
            <button
              type="button"
              onClick={() => setBorrando(false)}
              className="h-9 px-3 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
