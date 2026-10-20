import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { clientEnv } from "@/lib/env";
import type { Database } from "@/lib/db.types";

/**
 * Cliente de Supabase para componentes de servidor, Server Actions y Route
 * Handlers. Lee y refresca la sesión desde las cookies de la petición.
 *
 * Usa la clave publicable a propósito: las políticas RLS siguen aplicando del
 * lado del servidor, de modo que un error de programación no puede exponer
 * datos de otro juez.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Llamado desde un Server Component: las cookies son de sólo
            // lectura ahí. El refresco de sesión lo hace el proxy.
          }
        },
      },
    },
  );
}
