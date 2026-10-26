import type { MetadataRoute } from "next";

/**
 * Instalable como aplicación. Dos razones concretas, más allá del icono:
 *
 *  - El navegador concede almacenamiento persistente con mucha más facilidad
 *    a una PWA instalada, que es lo que protege la cola de calificaciones.
 *  - El juez abre un icono en lugar de teclear una URL en medio del concurso.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Calificación — Bandas de Guerra",
    short_name: "Calificación",
    description:
      "Calificación en vivo para encuentros intercolegiales de bandas de guerra.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    lang: "es-MX",
    orientation: "any",
    icons: [
      {
        src: "/icono.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
