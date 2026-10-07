import { z } from "zod";

/**
 * Único punto de acceso a variables de entorno.
 *
 * Centralizarlo mantiene el proyecto portable: si algún día deja de ser un
 * favor y hay que mudarse de Vercel Hobby a Cloudflare o Vercel Pro, éste es
 * el único archivo que conoce el entorno.
 *
 * Las NEXT_PUBLIC_* se leen de forma literal a propósito: Next.js las sustituye
 * en tiempo de compilación y no lo haría con un acceso dinámico.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL no es una URL válida"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Falta NEXT_PUBLIC_SUPABASE_ANON_KEY"),
});

function parse<T extends z.ZodTypeAny>(schema: T, raw: unknown): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const detalle = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Variables de entorno inválidas o faltantes:\n${detalle}\n\n` +
        `Copia .env.example a .env.local y llena los valores del panel de Supabase.`,
    );
  }
  return result.data;
}

/** Seguro de usar en el navegador. */
export const clientEnv = parse(clientSchema, {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

/**
 * Sólo para scripts y código de servidor. La service_role key ignora el RLS,
 * así que nunca debe importarse desde un componente de cliente.
 */
export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() no puede usarse en el navegador");
  }
  return parse(
    clientSchema.extend({
      SUPABASE_SERVICE_ROLE_KEY: z
        .string()
        .min(1, "Falta SUPABASE_SERVICE_ROLE_KEY (panel de Supabase → Settings → API)"),
    }),
    {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  );
}
