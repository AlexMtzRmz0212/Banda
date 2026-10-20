/**
 * Da de alta una cuenta. No hay registro público: el administrador crea a los
 * jueces, y el primer administrador se crea con este script.
 *
 *   npm run usuario -- --email juez1@ejemplo.com --nombre "Juan Pérez"
 *   npm run usuario -- --email admin@ejemplo.com --nombre "Coordinación" --admin
 *
 * Si no se pasa --password, se genera una y se imprime una sola vez: cópiala
 * y entrégasela al juez por un canal privado.
 */
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    nombre: { type: "string" },
    password: { type: "string" },
    admin: { type: "boolean", default: false },
  },
});

if (!values.email) {
  console.error(
    "\n  Falta --email\n\n" +
      '  npm run usuario -- --email juez1@ejemplo.com --nombre "Juan Pérez"\n' +
      '  npm run usuario -- --email admin@ejemplo.com --nombre "Coordinación" --admin\n',
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secret) {
  console.error("\n  Faltan credenciales en .env.local\n");
  process.exit(1);
}

/** Contraseña legible pero con suficiente entropía para dictarla por teléfono. */
function generarPassword(): string {
  return randomBytes(9).toString("base64url");
}

const admin = createClient(url, secret, { auth: { persistSession: false } });

async function main() {
  const password = values.password ?? generarPassword();
  const role = values.admin ? "admin" : "judge";

  const { data, error } = await admin.auth.admin.createUser({
    email: values.email!,
    password,
    email_confirm: true, // No hay servidor de correo configurado.
    user_metadata: { full_name: values.nombre ?? "", role },
  });

  if (error) {
    console.error(`\n  No se pudo crear la cuenta: ${error.message}\n`);
    process.exit(1);
  }

  // El perfil lo crea un trigger. Se verifica que el rol haya quedado bien:
  // si el trigger fallara, la cuenta existiría sin permisos y sería confuso.
  const { data: perfil } = await admin
    .from("profiles")
    .select("role, full_name")
    .eq("id", data.user!.id)
    .single();

  if (perfil?.role !== role) {
    console.error(
      `\n  La cuenta se creó pero el perfil quedó como "${perfil?.role}" ` +
        `en lugar de "${role}". Revisa el trigger handle_new_user.\n`,
    );
    process.exit(1);
  }

  console.log(
    `\n  ✓ ${role === "admin" ? "Administrador" : "Juez"} creado\n\n` +
      `    Correo      ${values.email}\n` +
      `    Contraseña  ${password}\n\n` +
      `  Esta contraseña no se vuelve a mostrar.\n`,
  );
}

main();
