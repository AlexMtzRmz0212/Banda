import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { cargarResultados } from "@/lib/reportes";
import { AdminShell, Empty, Section } from "@/components/admin-shell";
import { formatearFecha } from "@/lib/formato";

export const instant = false;

export default async function ReportesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const datos = await cargarResultados(id);
  if (!datos) notFound();

  const { evento, bandas } = datos;
  const incompletas = bandas.filter(
    (b) => b.hojasEntregadas < b.hojasTotales,
  ).length;

  return (
    <AdminShell
      title={evento.nombre}
      subtitle={`Reportes · ${formatearFecha(evento.fecha)}`}
      back={{ href: `/admin/${id}`, label: "Configuración del evento" }}
    >
      {incompletas > 0 ? (
        <p className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {incompletas === 1
            ? "Una banda tiene hojas sin entregar."
            : `${incompletas} bandas tienen hojas sin entregar.`}{" "}
          Los reportes se pueden generar igual, pero los totales estarán
          incompletos.
        </p>
      ) : null}

      <Section title="Del evento">
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/${id}/reportes/sumatoria`}
            className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm transition-colors hover:border-sky-500 hover:text-sky-400"
          >
            Hoja de Sumatoria Total
          </Link>
          <a
            href={`/admin/${id}/reportes/csv`}
            className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm transition-colors hover:border-sky-500 hover:text-sky-400"
          >
            Descargar CSV
          </a>
        </div>
      </Section>

      <Section title="Por banda">
        {bandas.length === 0 ? (
          <Empty>Este evento no tiene bandas registradas.</Empty>
        ) : (
          <ul className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
            {bandas.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/admin/${id}/reportes/banda/${b.id}`}
                  className="flex items-center gap-3 bg-slate-900/50 px-3 py-2.5 transition-colors hover:bg-slate-900"
                >
                  <span className="w-7 shrink-0 text-center text-sm text-slate-500 tabular-nums">
                    {b.turno}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{b.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {b.categoria} · {b.hojasEntregadas} de {b.hojasTotales}{" "}
                      hojas
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums">
                    {b.totalCompilatorio}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </AdminShell>
  );
}
