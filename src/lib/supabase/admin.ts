import "server-only";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "@/lib/db.types";

/**
 * Cliente con la clave secreta. IGNORA el RLS.
 *
 * Sólo existe para lo que la clave publicable no puede hacer: dar de alta
 * cuentas de juez. Toda función que lo use debe llamar antes a requireAdmin().
 *
 * `server-only` hace que el build falle si alguien lo importa desde un
 * componente de cliente, para que la clave no pueda llegar al navegador.
 */
export function createServiceClient() {
  const env = serverEnv();
  return createAdminClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}
