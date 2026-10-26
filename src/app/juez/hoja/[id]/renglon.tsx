"use client";

import { useEffect, useRef, useState } from "react";
import type { Criterio } from "./hoja";

type Estado = {
  value: number | null;
  observacion: string;
  guardando: boolean;
  error: string | null;
};

/** Redondea a la media más cercana dentro de 0.5 – 5.0. */
function aEscala(n: number): number {
  return Math.min(5, Math.max(0.5, Math.round(n * 2) / 2));
}

/**
 * Un renglón de la hoja.
 *
 * El campo acepta "4.5" o "45": los jueces van a teclear rápido y el punto
 * del teclado numérico se pierde con facilidad. Enter baja al siguiente;
 * las flechas suben o bajan media unidad.
 */
export function Renglon({
  numero,
  criterio,
  estado,
  bloqueada,
  escala,
  registrar,
  onCalificar,
  onObservacion,
}: {
  numero: number;
  criterio: Criterio;
  estado: Estado;
  bloqueada: boolean;
  escala: readonly number[];
  registrar: (el: HTMLInputElement | null) => void;
  onCalificar: (value: number, avanzar: boolean) => void;
  onObservacion: (texto: string) => void;
}) {
  const [texto, setTexto] = useState(
    estado.value === null ? "" : String(estado.value),
  );
  const [nota, setNota] = useState(estado.observacion);
  const [notaAbierta, setNotaAbierta] = useState(false);
  const ultimoEnviado = useRef<number | null>(estado.value);

  /**
   * Resincronizar cuando el valor cambia desde fuera.
   *
   * Al abrir la hoja, lo guardado en el dispositivo se mezcla encima de lo que
   * trajo el servidor, y eso ocurre DESPUÉS del primer render. Sin esto, el
   * campo seguiría mostrando el valor viejo del servidor mientras el subtotal
   * ya refleja el nuevo: el juez vería una calificación que no es la suya.
   */
  const [valorPrevio, setValorPrevio] = useState(estado.value);
  if (estado.value !== valorPrevio) {
    setValorPrevio(estado.value);
    setTexto(estado.value === null ? "" : String(estado.value));
  }

  // El dedup de Enter+blur se alinea aparte: un ref no se toca durante el
  // render. Si llegara a quedar desfasado, lo peor es un guardado de más,
  // y el upsert es idempotente.
  useEffect(() => {
    ultimoEnviado.current = estado.value;
  }, [estado.value]);

  const [notaPrevia, setNotaPrevia] = useState(estado.observacion);
  if (estado.observacion !== notaPrevia) {
    setNotaPrevia(estado.observacion);
    setNota(estado.observacion);
  }

  const aplicar = (crudo: string) => {
    const limpio = crudo.replace(",", ".").trim();
    if (!limpio) return;

    let n = Number(limpio);
    if (Number.isNaN(n)) return;

    // "45" significa 4.5, "35" significa 3.5. Un 5 suelto sigue siendo 5.
    if (n > 5 && limpio.length === 2 && !limpio.includes(".")) n = n / 10;

    const valor = aEscala(n);
    setTexto(String(valor));

    // Enter aplica y mueve el foco, lo que dispara el blur y volvería a
    // aplicar. Guardar dos veces es inofensivo (el upsert es idempotente),
    // pero es una petición de más por renglón. El ref se actualiza al
    // instante; el estado del padre podría no haber llegado todavía.
    if (ultimoEnviado.current === valor) return;
    ultimoEnviado.current = valor;

    onCalificar(valor, true);
  };

  /**
   * Las flechas ajustan sin bajar de renglón: subir de 3.0 a 4.0 son dos
   * flechas sobre el mismo renglón, no un salto al siguiente.
   */
  const ajustar = (delta: number) => {
    // Primera flecha sobre un renglón vacío: se posa en el punto medio en
    // lugar de saltar a 3.0, para que la tecla no decida la calificación.
    const valor =
      estado.value === null ? 2.5 : aEscala(estado.value + delta);
    setTexto(String(valor));
    ultimoEnviado.current = valor;
    onCalificar(valor, false);
  };

  return (
    <div className="flex flex-wrap items-start gap-3 border-b border-slate-800 bg-slate-900/40 px-3 py-2.5 last:border-b-0">
      <span className="w-6 shrink-0 pt-2 text-right text-sm text-slate-600 tabular-nums">
        {numero}
      </span>

      <div className="min-w-0 flex-1 basis-64">
        <p className="text-sm leading-snug">{criterio.label}</p>
        {criterio.deduction_hint ? (
          <p className="mt-0.5 text-xs text-amber-500/80">
            {criterio.deduction_hint}
          </p>
        ) : null}

        {notaAbierta || estado.observacion ? (
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            // Se encola al salir del campo, no en cada tecla: una nota larga
            // generaría una petición por letra.
            onBlur={() => {
              if (nota !== estado.observacion) onObservacion(nota);
            }}
            disabled={bloqueada}
            placeholder="Observaciones"
            aria-label={`Observaciones del renglón ${numero}`}
            className="mt-1.5 h-8 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs outline-none placeholder:text-slate-600 focus:border-sky-500 disabled:opacity-60"
          />
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* Botones de la escala, para quien use el ratón. */}
        <div className="hidden gap-0.5 lg:flex" role="group" aria-label="Escala">
          {escala.map((v) => (
            <button
              key={v}
              type="button"
              disabled={bloqueada}
              onClick={() => {
                setTexto(String(v));
                ultimoEnviado.current = v;
                onCalificar(v, false);
              }}
              className={
                "h-8 w-8 rounded text-xs tabular-nums transition-colors disabled:opacity-40 " +
                (estado.value === v
                  ? "bg-sky-500 font-semibold text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700")
              }
            >
              {v}
            </button>
          ))}
        </div>

        <input
          ref={registrar}
          value={texto}
          disabled={bloqueada}
          inputMode="decimal"
          aria-label={`Calificación del renglón ${numero}`}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={(e) => aplicar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              aplicar(e.currentTarget.value);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              ajustar(0.5);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              ajustar(-0.5);
            }
          }}
          className={
            "h-10 w-16 rounded-lg border bg-slate-950 text-center text-base tabular-nums outline-none disabled:opacity-60 " +
            (estado.error
              ? "border-red-500 text-red-400"
              : estado.value !== null
                ? "border-slate-700 text-white"
                : "border-amber-500/40")
          }
        />

        <button
          type="button"
          onClick={() => setNotaAbierta((v) => !v)}
          disabled={bloqueada}
          aria-label={`Observaciones del renglón ${numero}`}
          aria-expanded={notaAbierta || Boolean(estado.observacion)}
          className="h-8 w-8 rounded text-slate-600 hover:bg-slate-800 hover:text-slate-300 disabled:opacity-40"
        >
          ✎
        </button>

        <span
          aria-live="polite"
          className="w-4 text-xs text-slate-600"
          title={estado.error ?? undefined}
        >
          {estado.guardando ? "…" : estado.error ? "!" : ""}
        </span>
      </div>
    </div>
  );
}
