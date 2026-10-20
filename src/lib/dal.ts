import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db.types";

/**
 * Data Access Layer.
 *
 * Todo acceso a datos del lado del servidor pasa por aquí, y aquí se verifica
 * la sesión. La documentación de Next advierte que los layouts NO sirven para
 * proteger rutas (con renderizado parcial no se vuelven a ejecutar al navegar,
 * y un layout no decide si sus hijos se renderizan), así que la comprobación
 * vive junto al dato, no junto a la pantalla.
 *
 * El RLS de Postgres sigue siendo la frontera real: esto evita pantallas rotas
 * y redirige a tiempo, pero aunque alguien se lo saltara, la base no entrega
 * datos ajenos.
 */

export type Role = Database["public"]["Enums"]["user_role"];

export type Session = {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
};

/**
 * Sesión verificada contra el servidor de autenticación.
 *
 * `cache` la memoiza dentro de un mismo render de React. Ojo: según la
 * documentación de Next, las Server Actions y los Route Handlers no forman
 * parte de un render, así que ahí cada llamada se ejecuta de verdad — es lo
 * correcto para una mutación, que debe validarse por su cuenta.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();

  // getUser() contacta al servidor de auth y valida el token. getSession()
  // sólo lee la cookie, que el cliente podría manipular.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: profile.full_name,
    role: profile.role,
  };
});

/** Exige sesión. Redirige a /login si no hay. */
export const requireSession = cache(async (): Promise<Session> => {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
});

/** Exige rol de administrador. Un juez que llegue aquí va a su propia pantalla. */
export const requireAdmin = cache(async (): Promise<Session> => {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/juez");
  return session;
});

/** Exige rol de juez. Un admin que llegue aquí va al panel. */
export const requireJudge = cache(async (): Promise<Session> => {
  const session = await requireSession();
  if (session.role !== "judge") redirect("/admin");
  return session;
});

/** Ruta inicial según el rol. */
export function homeFor(role: Role): string {
  return role === "admin" ? "/admin" : "/juez";
}
