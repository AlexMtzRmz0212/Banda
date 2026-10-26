"use client";

import { useEffect } from "react";

/**
 * Registra el service worker.
 *
 * Sólo en producción: en desarrollo, una caché del shell de Next confunde
 * más de lo que ayuda cuando se está editando código.
 */
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const alCargar = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sin service worker la aplicación funciona igual: sólo pierde la
        // capacidad de abrir sin señal. No vale la pena molestar al juez.
      });
    };

    if (document.readyState === "complete") alCargar();
    else window.addEventListener("load", alCargar, { once: true });

    return () => window.removeEventListener("load", alCargar);
  }, []);

  return null;
}
