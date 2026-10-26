"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { db, pedirAlmacenamientoPersistente } from "./db";
import { vaciarCola } from "./sync";

/** Cada cuánto se reintenta por si el evento `online` no llegó. */
const LATIDO_MS = 15_000;

export type EstadoSync = {
  enLinea: boolean;
  pendientes: number;
  sincronizando: boolean;
  /** Último error del servidor, no de red. */
  error: string | null;
  sincronizar: () => void;
};

function suscribirAConexion(alCambiar: () => void) {
  window.addEventListener("online", alCambiar);
  window.addEventListener("offline", alCambiar);
  return () => {
    window.removeEventListener("online", alCambiar);
    window.removeEventListener("offline", alCambiar);
  };
}

/**
 * Vigila la cola y la vacía cuando se puede.
 *
 * El navegador avisa con `online`, pero ese evento sólo dice que hay una
 * interfaz de red: puede haber WiFi sin internet, que es justo lo que pasa en
 * un patio escolar. Por eso además se reintenta cada cierto tiempo y al
 * volver a la pestaña.
 */
export function useSync(): EstadoSync {
  const enLinea = useSyncExternalStore(
    suscribirAConexion,
    () => navigator.onLine,
    () => true, // En el servidor se asume conexión: no hay nada que encolar.
  );

  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sincronizar = useCallback(() => {
    setSincronizando(true);
    void vaciarCola()
      .then((r) => {
        setPendientes(r.pendientes);
        setError(r.error);
      })
      .finally(() => setSincronizando(false));
  }, []);

  // Al recuperar la conexión, vaciar la cola. Se difiere un tick para no
  // cambiar estado durante el propio efecto.
  useEffect(() => {
    if (!enLinea) return;
    const t = setTimeout(sincronizar, 0);
    return () => clearTimeout(t);
  }, [enLinea, sincronizar]);

  useEffect(() => {
    void pedirAlmacenamientoPersistente();

    void db.calificaciones
      .where("pendiente")
      .equals(1)
      .count()
      .then(setPendientes);

    const alVolver = () => {
      if (document.visibilityState === "visible") sincronizar();
    };

    document.addEventListener("visibilitychange", alVolver);
    const latido = setInterval(sincronizar, LATIDO_MS);

    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      clearInterval(latido);
    };
  }, [sincronizar]);

  return { enLinea, pendientes, sincronizando, error, sincronizar };
}
