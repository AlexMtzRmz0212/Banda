"use client";

import { useState } from "react";

/**
 * Muestra una contraseña recién generada.
 *
 * Es la única vez que se ve: después sólo queda su hash en la base. Por eso
 * incluye un botón de copiar — dictarla a mano es donde se cuelan los errores.
 */
export function Credenciales({
  credenciales,
}: {
  credenciales: { email: string; password: string };
}) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(
        `${credenciales.email}\n${credenciales.password}`,
      );
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: la contraseña sigue a la vista.
    }
  };

  return (
    <div
      role="status"
      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3"
    >
      <p className="text-sm font-medium text-emerald-300">
        Contraseña nueva. No se vuelve a mostrar.
      </p>
      <dl className="mt-2 grid gap-1 font-mono text-sm text-emerald-200">
        <div className="flex gap-2">
          <dt className="text-emerald-400/70">correo</dt>
          <dd className="break-all">{credenciales.email}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-emerald-400/70">clave</dt>
          <dd className="font-semibold">{credenciales.password}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={copiar}
        className="mt-2 text-xs text-emerald-400 underline-offset-4 hover:underline"
      >
        {copiado ? "Copiado" : "Copiar correo y contraseña"}
      </button>
      <p className="mt-2 text-xs text-emerald-400/70">
        Entrégasela al juez por un medio privado.
      </p>
    </div>
  );
}
