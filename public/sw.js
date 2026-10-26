/**
 * Service worker mínimo, escrito a mano.
 *
 * Su único trabajo es que la aplicación siga abriendo sin señal. Las
 * calificaciones NO pasan por aquí: viven en IndexedDB y las sube la cola
 * desde la pestaña (ver src/lib/offline/).
 *
 * Estrategia: la red primero y, si falla, lo último que se guardó. Para una
 * aplicación de captura esto es lo correcto — una hoja vieja en caché sería
 * peor que esperar un segundo cuando sí hay conexión.
 */

const CACHE = "banda-v1";

// Lo indispensable para que la pantalla abra sin red.
const BASE = ["/", "/juez", "/icono.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(BASE))
      // Si algo de la lista no está disponible, no se aborta la instalación:
      // vale más un service worker a medias que ninguno.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(
          claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // La autenticación nunca se sirve de caché: una sesión vieja confundiría
  // más de lo que ayuda.
  if (url.pathname.startsWith("/login") || url.pathname.startsWith("/auth")) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((respuesta) => {
        if (respuesta.ok && respuesta.type === "basic") {
          const copia = respuesta.clone();
          void caches.open(CACHE).then((c) => c.put(request, copia));
        }
        return respuesta;
      })
      .catch(async () => {
        const guardada = await caches.match(request);
        if (guardada) return guardada;

        // Navegación sin caché propia: se devuelve la raíz para que la
        // aplicación arranque y muestre lo que hay en el dispositivo.
        if (request.mode === "navigate") {
          const raiz = await caches.match("/");
          if (raiz) return raiz;
        }

        return new Response("Sin conexión", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }),
  );
});
