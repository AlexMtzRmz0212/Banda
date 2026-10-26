import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { AdminShell, Empty, Section } from "@/components/admin-shell";
import { NuevoJuez } from "./nuevo-juez";
import { FichaJuez } from "./ficha-juez";

export const instant = false;

export default async function JuecesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: perfiles } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "judge")
    .order("full_name");

  // El correo vive en auth.users, que no se expone por la API pública.
  const service = createServiceClient();
  const { data: cuentas } = await service.auth.admin.listUsers({
    perPage: 200,
  });

  const correoDe = new Map(
    (cuentas?.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );

  const jueces = (perfiles ?? []).map((p) => ({
    id: p.id,
    nombre: p.full_name,
    email: correoDe.get(p.id) ?? "",
  }));

  return (
    <AdminShell
      title="Jueces"
      subtitle="Cuentas para calificar"
      back={{ href: "/admin", label: "Eventos" }}
    >
      <Section title={`Cuentas (${jueces.length})`}>
        {jueces.length === 0 ? (
          <Empty>Todavía no hay cuentas de juez.</Empty>
        ) : (
          <ul className="space-y-2">
            {jueces.map((j) => (
              <li key={j.id}>
                <FichaJuez juez={j} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Nueva cuenta">
        <NuevoJuez />
      </Section>

      <p className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
        <strong className="text-slate-300">
          Las contraseñas no se pueden consultar.
        </strong>{" "}
        Supabase sólo guarda un resumen cifrado de cada una, a propósito: si la
        base de datos se filtrara, no se filtrarían las contraseñas de los
        jueces. Si un juez pierde la suya, genera una nueva aquí y entrégasela
        — se muestra una sola vez.
      </p>
    </AdminShell>
  );
}
