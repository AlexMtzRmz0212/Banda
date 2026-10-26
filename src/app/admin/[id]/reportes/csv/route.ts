import { requireAdmin } from "@/lib/dal";
import { cargarResultados } from "@/lib/reportes";

/**
 * Exporta los resultados del evento como CSV.
 *
 * Una fila por banda, una columna por puesto de juez, más los totales. Sirve
 * para revisar en una hoja de cálculo o archivar el evento.
 */

/** Escapa un campo para CSV. Las observaciones traen comas y comillas. */
function campo(valor: string | number | null): string {
  if (valor === null) return "";
  const s = String(valor);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;

  const datos = await cargarResultados(id);
  if (!datos) {
    return new Response("Evento no encontrado", { status: 404 });
  }

  const { evento, puestos, bandas, maximo } = datos;

  const encabezado = [
    "Turno",
    "Banda",
    "Categoria",
    ...puestos.map(
      (p) =>
        p.nombre +
        (p.judgeSlots > 1 ? ` - Juez ${p.judgeSlot}` : "") +
        ` (max ${p.maxPoints})`,
    ),
    // Comandante ya viene como una columna más arriba (es un puesto del
    // evento); repetir su total aquí sólo confundiría.
    `Total compilatorio (max ${maximo})`,
    "Hojas entregadas",
  ];

  const filas = bandas.map((b) => [
    b.turno,
    b.nombre,
    b.categoria,
    ...puestos.map((p) => {
      const r = b.puestos.find(
        (x) => x.templateId === p.templateId && x.judgeSlot === p.judgeSlot,
      );
      return r?.total ?? null;
    }),
    b.totalCompilatorio,
    `${b.hojasEntregadas} de ${b.hojasTotales}`,
  ]);

  const csv = [encabezado, ...filas]
    .map((f) => f.map(campo).join(","))
    .join("\r\n");

  // El BOM hace que Excel abra el archivo como UTF-8; sin él, los acentos de
  // los nombres de las bandas salen rotos.
  const cuerpo = "﻿" + csv;

  const nombre = `${evento.fecha}-${evento.nombre}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    // Sin guiones sueltos al inicio o al final: "…-prueba-.csv" se ve a medio
    // escribir.
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return new Response(cuerpo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
