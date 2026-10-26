"use client";

import type { EstadoSync } from "@/lib/offline/use-sync";

/**
 * Indicador de conexión y cola.
 *
 * El juez necesita saber, sin interpretar nada, si lo que calificó ya está a
 * salvo en el servidor o sigue sólo en su laptop. "Sin conexión" no es una
 * alarma: es el modo normal de trabajo en un patio, y por eso se pinta en
 * ámbar y no en rojo.
 */
export function EstadoConexion({ sync }: { sync: EstadoSync }) {
  const { enLinea, pendientes, sincronizando, error, sincronizar } = sync;

  if (error) {
    return (
      <button
        type="button"
        onClick={sincronizar}
        className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/25"
        title={error}
      >
        Error al guardar · reintentar
      </button>
    );
  }

  if (!enLinea) {
    return (
      <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-400">
        Sin conexión
        {pendientes > 0 ? ` · ${pendientes} por subir` : ""}
      </span>
    );
  }

  if (pendientes > 0) {
    return (
      <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-400">
        {sincronizando ? "Subiendo" : "Por subir"} · {pendientes}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
      Todo guardado
    </span>
  );
}
