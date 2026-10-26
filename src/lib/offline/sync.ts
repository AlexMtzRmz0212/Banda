"use client";

import { guardarCalificacion } from "@/app/juez/actions";
import { db, type CalificacionLocal } from "./db";

/**
 * Vaciado de la cola.
 *
 * Corre desde la pestaña del juez, no desde un service worker: una Server
 * Action no se puede invocar desde ahí, y el caso real es que el juez tiene
 * la hoja abierta mientras califica. Se intenta al recuperar la conexión, al
 * volver a la pestaña, y cada cierto tiempo por si acaso.
 */

/** Espera creciente tras un fallo, con tope. Evita martillar un servidor caído. */
function esperaDe(intentos: number): number {
  return Math.min(30_000, 1000 * 2 ** intentos);
}

/** Una calificación sin valor aún (sólo observación) no se puede subir. */
function lista(c: CalificacionLocal): boolean {
  return c.value !== null;
}

let corriendo = false;

export type ResultadoFlush = {
  subidas: number;
  pendientes: number;
  error: string | null;
};

export async function vaciarCola(): Promise<ResultadoFlush> {
  if (corriendo) return { subidas: 0, pendientes: 0, error: null };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const pendientes = await db.calificaciones
      .where("pendiente")
      .equals(1)
      .count();
    return { subidas: 0, pendientes, error: null };
  }

  corriendo = true;
  let subidas = 0;
  let error: string | null = null;

  try {
    const cola = await db.calificaciones.where("pendiente").equals(1).toArray();
    const ahora = Date.now();

    for (const c of cola) {
      if (!lista(c)) continue;

      // Respetar la espera del intento anterior.
      if (c.intentos > 0) {
        const desde = new Date(c.clientUpdatedAt).getTime();
        if (ahora - desde < esperaDe(c.intentos)) continue;
      }

      try {
        const r = await guardarCalificacion(
          c.sheetId,
          c.criterionId,
          c.value!,
          c.observacion,
          c.clientUpdatedAt,
        );

        if (r.error) {
          // Una hoja ya entregada no se va a aceptar por más que se reintente:
          // se deja de insistir y se conserva el dato local.
          const definitivo = /entregada/i.test(r.error);
          await db.calificaciones.update(c.id, {
            pendiente: definitivo ? 0 : 1,
            intentos: c.intentos + 1,
            ultimoError: r.error,
          });
          error = r.error;
        } else {
          await db.calificaciones.update(c.id, {
            pendiente: 0,
            intentos: 0,
            ultimoError: null,
          });
          subidas++;
        }
      } catch {
        // Fallo de red: se queda pendiente y se reintenta más tarde.
        await db.calificaciones.update(c.id, {
          intentos: c.intentos + 1,
          ultimoError: "Sin conexión",
        });
      }
    }
  } finally {
    corriendo = false;
  }

  const pendientes = await db.calificaciones
    .where("pendiente")
    .equals(1)
    .count();

  return { subidas, pendientes, error };
}
