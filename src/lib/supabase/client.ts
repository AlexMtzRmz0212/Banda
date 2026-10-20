"use client";

import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";
import type { Database } from "@/lib/db.types";

/**
 * Cliente de Supabase para el navegador. Usa la clave publicable, así que
 * todo lo que haga pasa por RLS: es el mismo nivel de acceso que tendría
 * cualquiera con las herramientas de desarrollo abiertas.
 */
export function createClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
