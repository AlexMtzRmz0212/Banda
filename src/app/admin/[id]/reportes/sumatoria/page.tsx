import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { cargarResultados } from "@/lib/reportes";
import { formatearFecha } from "@/lib/formato";
import { BotonImprimir } from "../boton-imprimir";

export const instant = false;

export default async function SumatoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const datos = await cargarResultados(id);
  if (!datos) notFound();

  const { evento, puestos, bandas, maximo } = datos;
  const sumables = puestos.filter((p) => p.sumaAlTotal);
  const comandante = puestos.filter((p) => !p.sumaAlTotal);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="no-imprimir mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/${id}/reportes`}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Reportes
        </Link>
        <BotonImprimir />
      </div>

      <div className="hoja-impresa">
        <header className="mb-5 text-center">
          <h1 className="text-lg font-bold uppercase">{evento.nombre}</h1>
          <p className="text-sm font-semibold uppercase">
            Hoja de Sumatoria Total
          </p>
          <p className="mt-1 text-sm">
            {formatearFecha(evento.fecha)}
            {evento.sede ? ` · ${evento.sede}` : ""}
          </p>
        </header>

        {bandas.length === 0 ? (
          <p className="text-center text-sm text-slate-500">
            Este evento no tiene bandas registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-slate-700 px-2 py-1 text-left">
                    NO
                  </th>
                  <th className="border border-slate-700 px-2 py-1 text-left">
                    ASPECTO
                  </th>
                  <th className="border border-slate-700 px-2 py-1 text-right">
                    MÁX
                  </th>
                  {bandas.map((b) => (
                    <th
                      key={b.id}
                      className="border border-slate-700 px-2 py-1 text-center align-bottom"
                    >
                      <span className="block max-w-[7rem] text-xs leading-tight">
                        {b.nombre}
                      </span>
                      <span className="text-[10px] font-normal opacity-70">
                        turno {b.turno}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sumables.map((p, i) => (
                  <tr key={`${p.templateId}-${p.judgeSlot}`}>
                    <td className="border border-slate-700 px-2 py-1 tabular-nums">
                      {i + 1}
                    </td>
                    <td className="border border-slate-700 px-2 py-1">
                      {p.nombre}
                      {p.judgeSlots > 1 ? ` — Juez ${p.judgeSlot}` : ""}
                    </td>
                    <td className="border border-slate-700 px-2 py-1 text-right tabular-nums opacity-70">
                      {p.maxPoints}
                    </td>
                    {bandas.map((b) => {
                      const r = b.puestos.find(
                        (x) =>
                          x.templateId === p.templateId &&
                          x.judgeSlot === p.judgeSlot,
                      );
                      return (
                        <td
                          key={b.id}
                          className="border border-slate-700 px-2 py-1 text-center tabular-nums"
                        >
                          {r?.total ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                <tr className="font-bold">
                  <td
                    colSpan={2}
                    className="border border-slate-700 px-2 py-1.5 text-right"
                  >
                    TOTAL COMPILATORIO
                  </td>
                  <td className="border border-slate-700 px-2 py-1.5 text-right tabular-nums">
                    {maximo}
                  </td>
                  {bandas.map((b) => (
                    <td
                      key={b.id}
                      className="border border-slate-700 px-2 py-1.5 text-center tabular-nums"
                    >
                      {b.totalCompilatorio}
                    </td>
                  ))}
                </tr>

                {comandante.map((p, i) => (
                  <tr key={`cmte-${i}`}>
                    <td className="border border-slate-700 px-2 py-1 tabular-nums">
                      {sumables.length + i + 1}
                    </td>
                    <td className="border border-slate-700 px-2 py-1">
                      {p.nombre}
                      <span className="ml-1 text-xs opacity-70">
                        (no suma al total)
                      </span>
                    </td>
                    <td className="border border-slate-700 px-2 py-1 text-right tabular-nums opacity-70">
                      {p.maxPoints}
                    </td>
                    {bandas.map((b) => (
                      <td
                        key={b.id}
                        className="border border-slate-700 px-2 py-1 text-center tabular-nums"
                      >
                        {b.totalComandante || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {bandas.some((b) => b.hojasEntregadas < b.hojasTotales) ? (
          <p className="mt-4 border border-amber-600/50 px-3 py-2 text-sm">
            <strong>Atención:</strong> hay hojas sin entregar. Los totales de
            esta sumatoria están incompletos.
          </p>
        ) : null}

        <div className="mt-12 flex justify-between gap-8 text-center text-sm">
          <div className="flex-1">
            <div className="border-t border-slate-600 pt-1">
              Nombre y firma del compilador
            </div>
          </div>
          <div className="flex-1">
            <div className="border-t border-slate-600 pt-1">
              Nombre y firma del observador
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
