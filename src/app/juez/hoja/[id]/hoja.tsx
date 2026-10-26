"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SCORE_SCALE } from "@/lib/sheets";
import { guardarLocal, leerHojaLocal } from "@/lib/offline/db";
import { useSync } from "@/lib/offline/use-sync";
import { entregarHoja, type ActionState } from "../../actions";
import { EstadoConexion } from "./estado-conexion";
import { Renglon } from "./renglon";

export type Criterio = {
  id: string;
  section: string | null;
  position: number;
  label: string;
  deduction_hint: string | null;
};

export type Calificacion = {
  criterion_id: string;
  value: number;
  observacion: string;
};

/** Estado local de cada renglón: lo capturado y si ya se guardó. */
type Estado = {
  value: number | null;
  observacion: string;
  guardando: boolean;
  error: string | null;
};

const inicialEntrega: ActionState = { error: null };

/**
 * La hoja de calificación.
 *
 * Pensada para teclado, que es como los jueces van a trabajar (laptops):
 * se escribe la calificación, Enter baja al siguiente renglón, y las flechas
 * suben o bajan de media en media. Los botones de la escala siguen ahí para
 * quien prefiera el ratón.
 */
export function Hoja({
  sheetId,
  bloqueada,
  observador,
  maxPoints,
  criterios,
  calificaciones,
}: {
  sheetId: string;
  bloqueada: boolean;
  observador: string;
  maxPoints: number;
  criterios: Criterio[];
  calificaciones: Calificacion[];
}) {
  const [estado, setEstado] = useState<Record<string, Estado>>(() =>
    Object.fromEntries(
      criterios.map((c) => {
        const previa = calificaciones.find((v) => v.criterion_id === c.id);
        return [
          c.id,
          {
            value: previa ? Number(previa.value) : null,
            observacion: previa?.observacion ?? "",
            guardando: false,
            error: null,
          },
        ];
      }),
    ),
  );

  const [entrega, entregarAction] = useActionState(
    entregarHoja,
    inicialEntrega,
  );

  const sync = useSync();
  const { sincronizar } = sync;

  /**
   * Lo capturado en el dispositivo manda sobre lo que trajo el servidor.
   *
   * Si el juez calificó sin señal y recarga la página, el servidor todavía no
   * sabe de esos renglones: sin esto, la recarga los borraría de la vista y
   * parecería que se perdieron.
   */
  useEffect(() => {
    let vigente = true;

    void leerHojaLocal(sheetId).then((locales) => {
      if (!vigente || locales.length === 0) return;

      setEstado((s) => {
        const copia = { ...s };
        for (const l of locales) {
          const actual = copia[l.criterionId];
          if (!actual) continue;
          copia[l.criterionId] = {
            ...actual,
            value: l.value ?? actual.value,
            observacion: l.observacion || actual.observacion,
          };
        }
        return copia;
      });
    });

    return () => {
      vigente = false;
    };
  }, [sheetId]);

  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const registrar = useCallback((i: number, el: HTMLInputElement | null) => {
    inputs.current[i] = el;
  }, []);

  /** Enter o una calificación capturada bajan al siguiente renglón vacío. */
  const siguiente = useCallback((desde: number) => {
    for (let i = desde + 1; i < inputs.current.length; i++) {
      const el = inputs.current[i];
      if (el && !el.disabled) {
        el.focus();
        el.select();
        return;
      }
    }
    inputs.current[desde]?.blur();
  }, []);

  /**
   * Captura una calificación.
   *
   * Primero al dispositivo, después a la red. La interfaz nunca espera al
   * servidor: el juez sigue calificando aunque no haya señal, y la cola se
   * encarga de subirlo cuando vuelva.
   */
  const calificar = useCallback(
    async (criterionId: string, value: number) => {
      setEstado((s) => ({
        ...s,
        [criterionId]: { ...s[criterionId], value, error: null },
      }));

      await guardarLocal(sheetId, criterionId, { value });
      sincronizar();
    },
    [sheetId, sincronizar],
  );

  const anotar = useCallback(
    async (criterionId: string, observacion: string) => {
      setEstado((s) => ({
        ...s,
        [criterionId]: { ...s[criterionId], observacion },
      }));

      await guardarLocal(sheetId, criterionId, { observacion });
      sincronizar();
    },
    [sheetId, sincronizar],
  );

  const capturados = useMemo(
    () => Object.values(estado).filter((e) => e.value !== null).length,
    [estado],
  );

  const subtotal = useMemo(
    () =>
      Object.values(estado).reduce((s, e) => s + (e.value ?? 0), 0),
    [estado],
  );

  const completa = capturados === criterios.length;

  return (
    <div className="pb-28">
      <ol className="overflow-hidden rounded-lg border border-slate-800">
        {criterios.map((c, i) => {
          // Los encabezados ("PERSONAL", "TOQUE 1") se pintan una sola vez,
          // al cambiar de sección.
          const nuevaSeccion = c.section && c.section !== criterios[i - 1]?.section;

          return (
            <li key={c.id}>
              {nuevaSeccion ? (
                <h2 className="border-y border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {c.section}
                </h2>
              ) : null}

              <Renglon
                numero={i + 1}
                criterio={c}
                estado={estado[c.id]}
                bloqueada={bloqueada}
                escala={SCORE_SCALE}
                registrar={(el) => registrar(i, el)}
                onCalificar={(v, avanzar) => {
                  void calificar(c.id, v);
                  if (avanzar) siguiente(i);
                }}
                onObservacion={(texto) => void anotar(c.id, texto)}
              />
            </li>
          );
        })}
      </ol>

      {/* Barra fija: el subtotal siempre a la vista, sin desplazarse. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex-1">
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <span>
                {capturados} de {criterios.length} renglones
              </span>
              <EstadoConexion sync={sync} />
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {subtotal.toFixed(1)}
              <span className="text-sm font-normal text-slate-500">
                {" / "}
                {maxPoints} pts
              </span>
            </p>
          </div>

          {bloqueada ? (
            <span className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-400">
              Entregada
            </span>
          ) : (
            <form action={entregarAction} className="flex items-center gap-2">
              <input type="hidden" name="sheet_id" value={sheetId} />
              <input
                name="observador"
                defaultValue={observador}
                placeholder="Nombre del observador"
                aria-label="Nombre del observador"
                className="h-10 w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm outline-none placeholder:text-slate-600 focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={!completa}
                title={
                  completa
                    ? "Entregar y bloquear la hoja"
                    : "Faltan renglones por calificar"
                }
                className="h-10 rounded-lg bg-sky-500 px-4 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Entregar
              </button>
            </form>
          )}
        </div>

        {entrega.error ? (
          <p
            role="alert"
            className="border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-center text-sm text-red-400"
          >
            {entrega.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
