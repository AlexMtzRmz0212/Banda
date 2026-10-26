"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Section } from "@/components/admin-shell";
import { Posiciones } from "./posiciones";
import { Avance } from "./avance";

export type Banda = {
  id: string;
  name: string;
  turno: number;
  category_id: string;
};

export type Plantilla = {
  id: string;
  code: string;
  name: string;
  judge_slots: number;
  counts_toward_total: boolean;
  max_points: number;
};

export type Asignacion = {
  id: string;
  template_id: string;
  judge_slot: number;
  judge_id: string;
  profiles: { full_name: string } | null;
};

/**
 * Las columnas vienen anulables porque Postgres no expresa NOT NULL en una
 * vista: el tipo generado refleja eso y no se fuerza aquí.
 */
export type TotalBanda = {
  band_id: string | null;
  total_compilatorio: number | null;
  total_comandante: number | null;
  sheets_submitted: number | null;
  sheets_started: number | null;
};

export type HojaTotal = {
  sheet_id: string | null;
  band_id: string | null;
  assignment_id: string | null;
  status: string | null;
  total: number | null;
};

/** Espera tras un cambio antes de recargar, para no consultar por cada tecla. */
const AGRUPAR_MS = 400;

/**
 * Tablero en vivo.
 *
 * Se suscribe a los cambios del evento y vuelve a leer los totales. Recargar
 * las vistas es más simple y más fiable que recalcular en el cliente a partir
 * de cada cambio suelto: los totales siempre salen de la misma fuente que
 * usará la premiación, así que no pueden discrepar.
 */
export function Tablero({
  eventId,
  maximo,
  categorias,
  bandas,
  plantillas,
  asignaciones,
  totalesIniciales,
  hojasIniciales,
}: {
  eventId: string;
  maximo: number;
  categorias: { id: string; name: string }[];
  bandas: Banda[];
  plantillas: Plantilla[];
  asignaciones: Asignacion[];
  totalesIniciales: TotalBanda[];
  hojasIniciales: HojaTotal[];
}) {
  const [totales, setTotales] = useState(totalesIniciales);
  const [hojas, setHojas] = useState(hojasIniciales);
  const [conectado, setConectado] = useState(false);
  const [ultimoCambio, setUltimoCambio] = useState<Date | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recargar = useCallback(async () => {
    const [{ data: t }, { data: h }] = await Promise.all([
      supabase
        .from("v_band_totals")
        .select(
          "band_id, total_compilatorio, total_comandante, sheets_submitted, sheets_started",
        )
        .eq("event_id", eventId),
      supabase
        .from("v_sheet_totals")
        .select("sheet_id, band_id, assignment_id, status, total")
        .eq("event_id", eventId),
    ]);

    if (t) setTotales(t as TotalBanda[]);
    if (h) setHojas(h as HojaTotal[]);
    setUltimoCambio(new Date());
  }, [supabase, eventId]);

  useEffect(() => {
    const agrupado = () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => void recargar(), AGRUPAR_MS);
    };

    // `scores` no lleva event_id, así que no se puede filtrar en el servidor;
    // se filtra al recargar. El RLS ya impide ver eventos ajenos.
    const canal = supabase
      .channel(`evento-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scores" },
        agrupado,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "score_sheets",
          filter: `event_id=eq.${eventId}`,
        },
        agrupado,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bands",
          filter: `event_id=eq.${eventId}`,
        },
        agrupado,
      )
      .subscribe((estado) => {
        setConectado(estado === "SUBSCRIBED");
      });

    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      void supabase.removeChannel(canal);
    };
  }, [supabase, eventId, recargar]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-sm">
        <span
          className={
            "inline-block h-2 w-2 rounded-full " +
            (conectado ? "bg-emerald-400" : "bg-slate-600")
          }
          aria-hidden
        />
        <span className="text-slate-400">
          {conectado ? "En vivo" : "Conectando…"}
          {ultimoCambio
            ? ` · actualizado ${ultimoCambio.toLocaleTimeString("es-MX")}`
            : ""}
        </span>
      </div>

      <Section title="Posiciones">
        <Posiciones
          categorias={categorias}
          bandas={bandas}
          totales={totales}
          maximo={maximo}
        />
      </Section>

      <Section title="Avance por hoja">
        <Avance
          eventId={eventId}
          bandas={bandas}
          plantillas={plantillas}
          asignaciones={asignaciones}
          hojas={hojas}
        />
      </Section>
    </div>
  );
}
