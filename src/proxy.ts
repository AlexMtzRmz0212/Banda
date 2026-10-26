import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";

/**
 * En Next.js 16 el antiguo Middleware se llama Proxy. Su único trabajo aquí es
 * refrescar el token de Supabase para que la sesión no expire a media tarde de
 * concurso, y sacar de las rutas privadas a quien no traiga sesión.
 *
 * La documentación de Next es explícita en que el proxy NO es una solución de
 * autorización: corre en cada petición, incluidas las prefetched, y sólo debe
 * hacer comprobaciones optimistas. La autorización de verdad vive en el DAL
 * (src/lib/dal.ts) y, en última instancia, en las políticas RLS de Postgres.
 */

const RUTAS_PUBLICAS = ["/login", "/auth", "/instalar"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Esta llamada es la que refresca el token. No quitarla.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const esPublica = RUTAS_PUBLICAS.some((r) => pathname.startsWith(r));

  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Para devolver al juez a donde iba después de entrar.
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Todo excepto archivos estáticos e imágenes. El service worker y el
     * manifiesto quedan fuera para que la PWA cargue sin sesión.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
