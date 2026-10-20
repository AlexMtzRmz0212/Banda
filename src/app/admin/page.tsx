import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { AdminShell, Empty, Section } from "@/components/admin-shell";
import { formatearFecha } from "@/lib/formato";
import { NuevoEvento } from "./nuevo-evento";

const ETIQUETA_ESTADO: Record<string, string> = {
  draft: "Borrador",
  live: "En curso",
  closed: "Cerrado",
};

const COLOR_ESTADO: Record<string, string> = {
  draft: "bg-slate-700 text-slate-300",
  live: "bg-emerald-500/15 text-emerald-400",
  closed: "bg-slate-800 text-slate-500",
};

export default async function AdminPage() {
  const session = await requireAdmin();
  const supabase = await createClient();

  const { data: eventos } = await supabase
    .from("events")
    .select("id, name, event_date, venue, status, bands(count)")
    .order("event_date", { ascending: false });

  return (
    <AdminShell title="Eventos" subtitle={session.email}>
      <Section title="Tus eventos">
        {eventos && eventos.length > 0 ? (
          <ul className="space-y-2">
            {eventos.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/admin/${e.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 transition-colors hover:border-slate-700 hover:bg-slate-900"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.name}</p>
                    <p className="mt-0.5 text-sm text-slate-400">
                      {formatearFecha(e.event_date)}
                      {e.venue ? ` · ${e.venue}` : ""}
                      {" · "}
                      {e.bands?.[0]?.count ?? 0} bandas
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${COLOR_ESTADO[e.status]}`}
                  >
                    {ETIQUETA_ESTADO[e.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Todavía no hay eventos. Crea el primero abajo.</Empty>
        )}
      </Section>

      <Section title="Nuevo evento">
        <NuevoEvento />
      </Section>
    </AdminShell>
  );
}
