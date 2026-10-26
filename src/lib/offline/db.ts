"use client";

import Dexie, { type EntityTable } from "dexie";

/**
 * Almacén local del juez.
 *
 * Cada toque se guarda aquí ANTES de salir a la red, así que una señal caída
 * no pierde nada: la calificación ya está en el dispositivo y se sincroniza
 * cuando vuelva la conexión.
 *
 * No hay una tabla de "cola" aparte. La bandera `pendiente` ES la cola: así
 * no pueden desincronizarse el dato y el encargo de subirlo, que es el error
 * clásico de este patrón.
 *
 * La clave `${sheetId}:${criterionId}` es la misma pareja que lleva la
 * restricción UNIQUE en Postgres. Por eso reenviar la cola es un upsert
 * idempotente y nunca duplica calificaciones.
 */

export type CalificacionLocal = {
  /** `${sheetId}:${criterionId}` */
  id: string;
  sheetId: string;
  criterionId: string;
  value: number | null;
  observacion: string;
  /** Reloj del dispositivo al calificar. Resuelve conflictos en el servidor. */
  clientUpdatedAt: string;
  /** 1 = falta subirla. Dexie no indexa booleanos. */
  pendiente: 0 | 1;
  intentos: number;
  ultimoError: string | null;
};

const db = new Dexie("banda-calificaciones") as Dexie & {
  calificaciones: EntityTable<CalificacionLocal, "id">;
};

db.version(1).stores({
  calificaciones: "id, sheetId, pendiente",
});

export { db };

export function claveDe(sheetId: string, criterionId: string): string {
  return `${sheetId}:${criterionId}`;
}

/** Guarda una calificación localmente y la marca para subir. */
export async function guardarLocal(
  sheetId: string,
  criterionId: string,
  cambios: { value?: number; observacion?: string },
): Promise<void> {
  const id = claveDe(sheetId, criterionId);
  const previa = await db.calificaciones.get(id);

  await db.calificaciones.put({
    id,
    sheetId,
    criterionId,
    value: cambios.value ?? previa?.value ?? null,
    observacion: cambios.observacion ?? previa?.observacion ?? "",
    clientUpdatedAt: new Date().toISOString(),
    pendiente: 1,
    intentos: 0,
    ultimoError: null,
  });
}

/** Lo capturado en una hoja, tal como está en el dispositivo. */
export async function leerHojaLocal(
  sheetId: string,
): Promise<CalificacionLocal[]> {
  return db.calificaciones.where("sheetId").equals(sheetId).toArray();
}

/**
 * Pide al navegador que no borre estos datos.
 *
 * Sin esto, el navegador puede vaciar IndexedDB cuando le falta espacio —
 * el único riesgo real que tendría una aplicación de escritorio y ésta no.
 * Instalada como PWA, casi siempre se concede sin preguntar.
 */
export async function pedirAlmacenamientoPersistente(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
