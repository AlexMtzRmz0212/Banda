/**
 * Catálogo de hojas de evaluación — transcrito de
 * "HOJAS DE EVALUACION INTERCOLEGIALES.pdf" (2º Encuentro Intercolegial
 * de Bandas de Guerra).
 *
 * IMPORTANTE: el número de toques y de marchas NO es fijo. Lo define cada
 * convocatoria y puede ser mayor o menor. Por eso estas hojas se arman por
 * evento: `buildCatalog({ toques, marchas })` devuelve las hojas concretas de
 * una convocatoria, y el total compilatorio se calcula a partir de ellas.
 *
 * Los 665 puntos del PDF corresponden a la convocatoria del 2º Encuentro
 * (3 toques, 1 marcha) — no son una constante del sistema.
 *
 * El PDF lista 16 renglones sumables porque seis hojas se evalúan por
 * duplicado (Juez 1 y Juez 2). Aquí son 10 plantillas con `judgeSlots: 2`,
 * más Comandante, que no suma al total de la banda.
 */

/** Valor máximo de un criterio individual. La escala es 0.5 → 5.0 en pasos de 0.5. */
export const MAX_PER_CRITERION = 5.0;

/** Escala de calificación tal como aparece impresa en cada hoja. */
export const SCORE_SCALE = [
  5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5,
] as const;

/** Se incrementa cuando cambia el reglamento. Las plantillas se versionan. */
export const CATALOG_VERSION = 1;

/** Cuántas repeticiones usa una convocatoria. */
export type Convocatoria = {
  /** Toques de ordenanza por hoja (cajeros y cornetas). */
  toques: number;
  /** Marchas reglamentarias por hoja (cajas y cornetas). */
  marchas: number;
};

/** La del PDF: 3 toques y 1 marcha. Da 665 puntos. */
export const CONVOCATORIA_PDF: Convocatoria = { toques: 3, marchas: 1 };

/** Total compilatorio impreso en la "Hoja de Sumatoria Total" del PDF. */
export const TOTAL_PDF = 665;

export type CriterionDef = {
  /** Encabezado de sección dentro de la hoja ("PERSONAL", "TOQUE 1"). */
  section: string | null;
  label: string;
  /**
   * Criterios que el juez calcula restando en lugar de calificar de corrido.
   * Se capturan a mano; la interfaz sólo muestra la regla como ayuda.
   */
  deductionHint?: string;
};

/** Hojas cuyo número de secciones lo fija la convocatoria. */
export type RepeatSpec = {
  /** Cómo se encabeza cada repetición: "TOQUE 1", "MARCHA 1"… */
  label: string;
  /** Qué se califica en cada repetición. */
  aspects: string[];
  /** Cuál de los contadores de la convocatoria manda. */
  countKey: keyof Convocatoria;
};

export type SheetDef = {
  code: string;
  name: string;
  /** Cuántos jueces llenan esta hoja por banda (Juez 1 / Juez 2). */
  judgeSlots: 1 | 2;
  /** Comandante se califica pero no suma al total de la banda. */
  countsTowardTotal: boolean;
  /** Hojas de contenido fijo. */
  criteria?: CriterionDef[];
  /** Hojas que crecen o encogen según la convocatoria. */
  repeat?: RepeatSpec;
};

/** Una hoja ya resuelta para una convocatoria concreta. */
export type ResolvedSheet = Omit<SheetDef, "criteria" | "repeat"> & {
  criteria: CriterionDef[];
  maxPoints: number;
};

const TIEMPO_DE_MARCHA: CriterionDef = {
  section: null,
  label: "TIEMPO DE MARCHA",
  deductionHint: "1 punto menos por cada 10 seg faltantes o excedentes",
};

const plano = (labels: string[]): CriterionDef[] =>
  labels.map((label) => ({ section: null, label }));

export const SHEETS: SheetDef[] = [
  // ─── Revista de Personal — 9 criterios — 45 pts ─────────────────────────
  {
    code: "revista_personal",
    name: "Revista de Personal",
    judgeSlots: 1,
    countsTowardTotal: true,
    criteria: [
      {
        section: "PERSONAL",
        label:
          "El personal presenta su cedula. Credencial visible en el área de revista.",
        deductionHint:
          "0.5 puntos por cada elemento que no presente este documento o no aparezca en su cedula",
      },
      {
        section: "PERSONAL",
        label:
          "Integrantes del grupo sin objetos ostentosos (anillos, relojes, pulseras, collares, etc.)",
      },
      {
        section: "PERSONAL",
        label:
          "Se presentan con las manos limpias, sin manchas, uñas recortadas, limpias, sin pintar (si porta guantes, se retiran para revisión)",
      },
      {
        section: "PERSONAL",
        label:
          "Los integrantes se presentan con el corte de cabello similar en hombres, peinado similar y sin maquillaje en mujeres.",
      },
      {
        section: "UNIFORME",
        label:
          "Sin importar su tipo, calidad o costo, que se presenten similares.",
      },
      {
        section: "UNIFORME",
        label:
          "Camisola, levita, camisa, playera o suéter debe encontrarse limpio, planchado, presentable, misma tonalidad y tipo; en el caso de traer bolsas estas deberán de encontrarse sin objetos en su interior.",
      },
      {
        section: "UNIFORME",
        label:
          "Golpes se observan cocidos y a la misma altura; 2 golpes para manga corta y 4 golpes para manga larga (tomar de referencia al comandante).",
      },
      {
        section: "UNIFORME",
        label:
          "Pantalón o falda planchado, sin manchas o roturas. En mujeres, si usa media o calceta, que sea del mismo tipo y tono.",
      },
      {
        section: "UNIFORME",
        label:
          "Sin importar su tipo, costo o calidad, el calzado se debe observar lustrado y sin manchas.",
      },
    ],
  },

  // ─── Revista de Instrumentos: Caja — 10 criterios — 50 pts ──────────────
  {
    code: "revista_caja",
    name: "Revista de Instrumentos — Caja",
    judgeSlots: 1,
    countsTowardTotal: true,
    criteria: plano([
      "El vaso y aros se encuentran limpios y en buen estado.",
      'Cuenta con puente, botón, oído, gancho perico y gancho "s" (gancho "s" n/a en tamaño infantil).',
      "La piola se encuentra limpia, en buen estado y es uniforme en material, tipo y sin uniones.",
      "El armado es el correcto, los cuetes son uniformes, templaderas limpias y en buen estado.",
      "Cuentan los tambores con la misma cantidad de entorchados en el parche batidor y bordonero.",
      "Las portacajas son del mismo material y tipo. El baquetero se encuentra en buen estado, limpio y pulido. Se presentan lustrados sin manchas.",
      "Los parches se encuentran en buen estado, limpios y son del mismo material y tipo.",
      "El cubre cajas se encuentra limpio, planchado y en buen estado.",
      "Las baquetas se encuentran en buen estado y son del mismo material y tipo. Si lleva algún recubrimiento vinil o acrílico, deberá estar en buen estado. Si lleva casquillo, deberán estar limpios y pulidos.",
      "El sonido del tambor es similar en todos.",
    ]),
  },

  // ─── Revista de Instrumentos: Corneta/Clarín — 6 criterios — 30 pts ─────
  {
    code: "revista_corneta",
    name: "Revista de Instrumentos — Corneta/Clarín",
    judgeSlots: 1,
    countsTowardTotal: true,
    criteria: plano([
      "Se encuentra presentable, en buen estado y limpia (interna, 2cms más allá del pabellón y externamente). Si lleva clarín, aplica el mismo concepto.",
      "La corneta se encuentra correctamente vestida y cuelga del cuello del usuario a la altura de las rodillas. Si portan corneta y clarín y usa trenzado, deberán de estar similares en su formado.",
      "La vestidura se encuentra limpia y en buen estado, son del mismo material, color y tipo, sea para corneta o clarín. No puede tener tramos añadidos o seccionados.",
      "El tudel se encuentra a la misma altura y todos son del mismo material y tipo (se toma de referencia al C.O.).",
      "Cuenta con todos los accesorios que son visibles (2 argollas, tornillo mariposa, abrazadera, vestidura). En clarín, aplica para los propios (3 argollas, vestidura).",
      "La boquilla se encontrará incorporada a la corneta, limpia en su exterior, presentable y sin cordones o cadenas de ningún tipo.",
    ]),
  },

  // ─── Orden Cerrado — 8 criterios — 40 pts ───────────────────────────────
  {
    code: "orden_cerrado",
    name: "Orden Cerrado",
    judgeSlots: 1,
    countsTowardTotal: true,
    criteria: plano([
      "Correcta postura de la posición en la que se encuentren (se penaliza cuando un integrante la pierde).",
      "Movimientos innecesarios (se penaliza cuando un integrante realiza movimientos extras a comparación de los demás, cuando se tiran boquillas, portacajas o baquetas fuera de su lugar).",
      "Coordinación de movimientos (se penaliza cuando un integrante pierde la igualdad).",
      "Fuerza en los movimientos (se penaliza cuando un integrante deja de hacerlo con energía).",
      "Seguridad en los desplazamientos (se penaliza cuando un integrante se equivoca al realizarlos en giros o marchas).",
      "Vistas al frente (se penaliza cuando un integrante baja o voltea a ver a otro lugar).",
      "Desplantes (se penaliza la desigualdad).",
      "Braceo (se penaliza la desigualdad). Se evaluará a la entrada y salida del área de competencia.",
    ]),
  },

  // ─── Toques de Ordenanza — varían por convocatoria — × 2 jueces ─────────
  {
    code: "toques_cajeros",
    name: "Toques de Ordenanza — Cajeros",
    judgeSlots: 2,
    countsTowardTotal: true,
    repeat: {
      label: "TOQUE",
      countKey: "toques",
      aspects: ["FUERZA", "PRECISION", "CADENCIA", "IGUALDAD DE MOVIMIENTOS"],
    },
  },
  {
    code: "toques_cornetas",
    name: "Toques de Ordenanza — Cornetas",
    judgeSlots: 2,
    countsTowardTotal: true,
    repeat: {
      label: "TOQUE",
      countKey: "toques",
      aspects: ["AFINACION", "PRECISION", "CADENCIA", "POTENCIA"],
    },
  },

  // ─── Marcha Reglamentaria — varían por convocatoria — × 2 jueces ────────
  {
    code: "marcha_cajas",
    name: "Marcha Reglamentaria — Cajas",
    judgeSlots: 2,
    countsTowardTotal: true,
    repeat: {
      label: "MARCHA",
      countKey: "marchas",
      aspects: [
        "FUERZA",
        "PRECISION",
        "CADENCIA",
        "IGUALDAD DE MOVIMIENTOS",
        "RITMO",
      ],
    },
  },
  {
    code: "marcha_cornetas",
    name: "Marcha Reglamentaria — Cornetas",
    judgeSlots: 2,
    countsTowardTotal: true,
    repeat: {
      label: "MARCHA",
      countKey: "marchas",
      aspects: [
        "AFINACION",
        "PRECISION",
        "CADENCIA",
        "POTENCIA",
        "AGRADABLE AL OIDO",
      ],
    },
  },

  // ─── Rutina Libre — 8 criterios — 40 pts × 2 jueces ─────────────────────
  {
    code: "rutina_cajeros",
    name: "Rutina Libre — Cajeros",
    judgeSlots: 2,
    countsTowardTotal: true,
    criteria: [
      ...plano([
        "FUERZA",
        "CADENCIA",
        "PRECISION",
        "RITMO",
        "CREATIVIDAD",
        "CLARIDAD EN LOS GOLPES",
        "IGUALDAD DE MOVIMIENTOS",
      ]),
      TIEMPO_DE_MARCHA,
    ],
  },
  {
    code: "rutina_cornetas",
    name: "Rutina Libre — Cornetas",
    judgeSlots: 2,
    countsTowardTotal: true,
    criteria: [
      ...plano([
        "AFINACION",
        "CADENCIA",
        "PRECISION",
        "POTENCIA",
        "RITMO",
        "CREATIVIDAD",
        "TONO AGRADABLE AL OIDO",
      ]),
      TIEMPO_DE_MARCHA,
    ],
  },

  // ─── Comandante — 8 criterios — 40 pts — NO suma al total ───────────────
  {
    code: "comandante",
    name: "Comandante",
    judgeSlots: 1,
    countsTowardTotal: false,
    criteria: plano([
      "Voz de mando clara.",
      "Voz de mando fuerte.",
      "Voz de mando precisa.",
      "Distorsión de la voz.",
      "Seguridad de sus movimientos.",
      "Sincronía con la banda.",
      "Correcto empleo de las voces de mando durante toda su participación.",
      "Vistas al frente (se penaliza cada vez que se pierde la postura).",
    ]),
  },
];

/** Criterios concretos de una hoja para una convocatoria dada. */
export function criteriaFor(
  sheet: SheetDef,
  conv: Convocatoria,
): CriterionDef[] {
  if (sheet.criteria) return sheet.criteria;
  if (!sheet.repeat) return [];

  const { label, aspects, countKey } = sheet.repeat;
  const count = conv[countKey];

  return Array.from({ length: count }, (_, i) =>
    aspects.map((a) => ({ section: `${label} ${i + 1}`, label: a })),
  ).flat();
}

/** El catálogo completo, ya resuelto para una convocatoria. */
export function buildCatalog(
  conv: Convocatoria = CONVOCATORIA_PDF,
): ResolvedSheet[] {
  return SHEETS.map(({ criteria: _c, repeat: _r, ...rest }) => {
    const criteria = criteriaFor({ ...rest, criteria: _c, repeat: _r }, conv);
    return { ...rest, criteria, maxPoints: criteria.length * MAX_PER_CRITERION };
  });
}

/** Suma de las hojas sumables, contando ambos jueces donde aplica. */
export function totalCompilatorio(
  conv: Convocatoria = CONVOCATORIA_PDF,
): number {
  return buildCatalog(conv)
    .filter((s) => s.countsTowardTotal)
    .reduce((sum, s) => sum + s.maxPoints * s.judgeSlots, 0);
}

/** Renglones de la "Hoja de Sumatoria Total" (16 sumables + Comandante). */
export function sumatoriaRowCount(sheets: { judgeSlots: number }[]): number {
  return sheets.reduce((n, s) => n + s.judgeSlots, 0);
}
