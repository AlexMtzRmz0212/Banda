/**
 * Catálogo de hojas de evaluación — transcrito de
 * "HOJAS DE EVALUACION INTERCOLEGIALES.pdf" (2º Encuentro Intercolegial
 * de Bandas de Guerra).
 *
 * Esta es la fuente de la verdad: el seed de la base de datos y las pruebas
 * se derivan de aquí. Si cambia el reglamento, se incrementa CATALOG_VERSION
 * y se crea una nueva versión de plantillas, de modo que los eventos pasados
 * siguan siendo reproducibles.
 *
 * Modelo: el PDF lista 16 hojas sumables porque seis de ellas se evalúan por
 * duplicado (Juez 1 y Juez 2). Aquí se representan como 10 plantillas con
 * `judgeSlots: 2`, más Comandante, que NO suma al total de la banda.
 *
 *   4 hojas × 1 juez  = 45 + 50 + 30 + 40            = 165
 *   6 hojas × 2 jueces = (60 + 60 + 25 + 25 + 40 + 40) × 2 = 500
 *   ------------------------------------------------------------
 *   TOTAL COMPILATORIO                                    = 665
 */

/** Valor máximo de un criterio individual. La escala es 0.5 → 5.0 en pasos de 0.5. */
export const MAX_PER_CRITERION = 5.0;

/** Escala de calificación tal como aparece impresa en cada hoja. */
export const SCORE_SCALE = [
  5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5,
] as const;

/** Se incrementa cuando cambia el reglamento. Las plantillas se versionan. */
export const CATALOG_VERSION = 1;

/** Total compilatorio impreso en la "Hoja de Sumatoria Total". */
export const TOTAL_COMPILATORIO = 665;

export type CriterionDef = {
  /** Encabezado de sección dentro de la hoja (p. ej. "PERSONAL", "TOQUE 1"). */
  section: string | null;
  label: string;
  /**
   * Criterios que el juez calcula restando en lugar de calificar de corrido.
   * En v1 se capturan a mano; la UI sólo muestra la regla como ayuda.
   */
  deductionHint?: string;
};

export type SheetDef = {
  code: string;
  name: string;
  /** Cuántos jueces llenan esta hoja por banda (Juez 1 / Juez 2). */
  judgeSlots: 1 | 2;
  /** Comandante se califica pero no suma al total de la banda. */
  countsTowardTotal: boolean;
  criteria: CriterionDef[];
};

/** Puntaje máximo de una hoja = número de criterios × 5.0 */
export function maxPointsOf(sheet: SheetDef): number {
  return sheet.criteria.length * MAX_PER_CRITERION;
}

/** Los cuatro aspectos que se califican en cada toque de cajeros. */
const TOQUE_CAJEROS = [
  "FUERZA",
  "PRECISION",
  "CADENCIA",
  "IGUALDAD DE MOVIMIENTOS",
];

/** Los cuatro aspectos que se califican en cada toque de cornetas. */
const TOQUE_CORNETAS = ["AFINACION", "PRECISION", "CADENCIA", "POTENCIA"];

/** Construye los 12 criterios de una hoja de toques (3 toques × 4 aspectos). */
function toques(aspects: string[]): CriterionDef[] {
  return [1, 2, 3].flatMap((n) =>
    aspects.map((label) => ({ section: `TOQUE ${n}`, label })),
  );
}

const TIEMPO_DE_MARCHA: CriterionDef = {
  section: null,
  label: "TIEMPO DE MARCHA",
  deductionHint:
    "1 punto menos por cada 10 seg faltantes o excedentes",
};

export const SHEETS: SheetDef[] = [
  // ─── 1. Revista de Personal — 9 criterios — 45 pts ──────────────────────
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

  // ─── 2. Revista de Instrumentos: Caja — 10 criterios — 50 pts ───────────
  {
    code: "revista_caja",
    name: "Revista de Instrumentos — Caja",
    judgeSlots: 1,
    countsTowardTotal: true,
    criteria: [
      { section: null, label: "El vaso y aros se encuentran limpios y en buen estado." },
      {
        section: null,
        label:
          'Cuenta con puente, botón, oído, gancho perico y gancho "s" (gancho "s" n/a en tamaño infantil).',
      },
      {
        section: null,
        label:
          "La piola se encuentra limpia, en buen estado y es uniforme en material, tipo y sin uniones.",
      },
      {
        section: null,
        label:
          "El armado es el correcto, los cuetes son uniformes, templaderas limpias y en buen estado.",
      },
      {
        section: null,
        label:
          "Cuentan los tambores con la misma cantidad de entorchados en el parche batidor y bordonero.",
      },
      {
        section: null,
        label:
          "Las portacajas son del mismo material y tipo. El baquetero se encuentra en buen estado, limpio y pulido. Se presentan lustrados sin manchas.",
      },
      {
        section: null,
        label:
          "Los parches se encuentran en buen estado, limpios y son del mismo material y tipo.",
      },
      {
        section: null,
        label: "El cubre cajas se encuentra limpio, planchado y en buen estado.",
      },
      {
        section: null,
        label:
          "Las baquetas se encuentran en buen estado y son del mismo material y tipo. Si lleva algún recubrimiento vinil o acrílico, deberá estar en buen estado. Si lleva casquillo, deberán estar limpios y pulidos.",
      },
      { section: null, label: "El sonido del tambor es similar en todos." },
    ],
  },

  // ─── 3. Revista de Instrumentos: Corneta/Clarín — 6 criterios — 30 pts ──
  {
    code: "revista_corneta",
    name: "Revista de Instrumentos — Corneta/Clarín",
    judgeSlots: 1,
    countsTowardTotal: true,
    criteria: [
      {
        section: null,
        label:
          "Se encuentra presentable, en buen estado y limpia (interna, 2cms más allá del pabellón y externamente). Si lleva clarín, aplica el mismo concepto.",
      },
      {
        section: null,
        label:
          "La corneta se encuentra correctamente vestida y cuelga del cuello del usuario a la altura de las rodillas. Si portan corneta y clarín y usa trenzado, deberán de estar similares en su formado.",
      },
      {
        section: null,
        label:
          "La vestidura se encuentra limpia y en buen estado, son del mismo material, color y tipo, sea para corneta o clarín. No puede tener tramos añadidos o seccionados.",
      },
      {
        section: null,
        label:
          "El tudel se encuentra a la misma altura y todos son del mismo material y tipo (se toma de referencia al C.O.).",
      },
      {
        section: null,
        label:
          "Cuenta con todos los accesorios que son visibles (2 argollas, tornillo mariposa, abrazadera, vestidura). En clarín, aplica para los propios (3 argollas, vestidura).",
      },
      {
        section: null,
        label:
          "La boquilla se encontrará incorporada a la corneta, limpia en su exterior, presentable y sin cordones o cadenas de ningún tipo.",
      },
    ],
  },

  // ─── 4. Orden Cerrado — 8 criterios — 40 pts ────────────────────────────
  {
    code: "orden_cerrado",
    name: "Orden Cerrado",
    judgeSlots: 1,
    countsTowardTotal: true,
    criteria: [
      {
        section: null,
        label:
          "Correcta postura de la posición en la que se encuentren (se penaliza cuando un integrante la pierde).",
      },
      {
        section: null,
        label:
          "Movimientos innecesarios (se penaliza cuando un integrante realiza movimientos extras a comparación de los demás, cuando se tiran boquillas, portacajas o baquetas fuera de su lugar).",
      },
      {
        section: null,
        label:
          "Coordinación de movimientos (se penaliza cuando un integrante pierde la igualdad).",
      },
      {
        section: null,
        label:
          "Fuerza en los movimientos (se penaliza cuando un integrante deja de hacerlo con energía).",
      },
      {
        section: null,
        label:
          "Seguridad en los desplazamientos (se penaliza cuando un integrante se equivoca al realizarlos en giros o marchas).",
      },
      {
        section: null,
        label:
          "Vistas al frente (se penaliza cuando un integrante baja o voltea a ver a otro lugar).",
      },
      { section: null, label: "Desplantes (se penaliza la desigualdad)." },
      {
        section: null,
        label:
          "Braceo (se penaliza la desigualdad). Se evaluará a la entrada y salida del área de competencia.",
      },
    ],
  },

  // ─── 5. Toques de Ordenanza Cajeros — 12 criterios — 60 pts × 2 jueces ──
  {
    code: "toques_cajeros",
    name: "Toques de Ordenanza — Cajeros",
    judgeSlots: 2,
    countsTowardTotal: true,
    criteria: toques(TOQUE_CAJEROS),
  },

  // ─── 6. Toques de Ordenanza Cornetas — 12 criterios — 60 pts × 2 jueces ─
  {
    code: "toques_cornetas",
    name: "Toques de Ordenanza — Cornetas",
    judgeSlots: 2,
    countsTowardTotal: true,
    criteria: toques(TOQUE_CORNETAS),
  },

  // ─── 7. Marcha Reglamentaria Cajas — 5 criterios — 25 pts × 2 jueces ────
  {
    code: "marcha_cajas",
    name: "Marcha Reglamentaria — Cajas",
    judgeSlots: 2,
    countsTowardTotal: true,
    criteria: [
      "FUERZA",
      "PRECISION",
      "CADENCIA",
      "IGUALDAD DE MOVIMIENTOS",
      "RITMO",
    ].map((label) => ({ section: null, label })),
  },

  // ─── 8. Marcha Reglamentaria Cornetas — 5 criterios — 25 pts × 2 jueces ─
  {
    code: "marcha_cornetas",
    name: "Marcha Reglamentaria — Cornetas",
    judgeSlots: 2,
    countsTowardTotal: true,
    criteria: [
      "AFINACION",
      "PRECISION",
      "CADENCIA",
      "POTENCIA",
      "AGRADABLE AL OIDO",
    ].map((label) => ({ section: null, label })),
  },

  // ─── 9. Rutina Libre Cajeros — 8 criterios — 40 pts × 2 jueces ──────────
  {
    code: "rutina_cajeros",
    name: "Rutina Libre — Cajeros",
    judgeSlots: 2,
    countsTowardTotal: true,
    criteria: [
      ...[
        "FUERZA",
        "CADENCIA",
        "PRECISION",
        "RITMO",
        "CREATIVIDAD",
        "CLARIDAD EN LOS GOLPES",
        "IGUALDAD DE MOVIMIENTOS",
      ].map((label) => ({ section: null, label })),
      TIEMPO_DE_MARCHA,
    ],
  },

  // ─── 10. Rutina Libre Cornetas — 8 criterios — 40 pts × 2 jueces ────────
  {
    code: "rutina_cornetas",
    name: "Rutina Libre — Cornetas",
    judgeSlots: 2,
    countsTowardTotal: true,
    criteria: [
      ...[
        "AFINACION",
        "CADENCIA",
        "PRECISION",
        "POTENCIA",
        "RITMO",
        "CREATIVIDAD",
        "TONO AGRADABLE AL OIDO",
      ].map((label) => ({ section: null, label })),
      TIEMPO_DE_MARCHA,
    ],
  },

  // ─── 11. Comandante — 8 criterios — 40 pts — NO suma al total ───────────
  {
    code: "comandante",
    name: "Comandante",
    judgeSlots: 1,
    countsTowardTotal: false,
    criteria: [
      { section: null, label: "Voz de mando clara." },
      { section: null, label: "Voz de mando fuerte." },
      { section: null, label: "Voz de mando precisa." },
      { section: null, label: "Distorsión de la voz." },
      { section: null, label: "Seguridad de sus movimientos." },
      { section: null, label: "Sincronía con la banda." },
      {
        section: null,
        label:
          "Correcto empleo de las voces de mando durante toda su participación.",
      },
      {
        section: null,
        label:
          "Vistas al frente (se penaliza cada vez que se pierde la postura).",
      },
    ],
  },
];

/** Suma de todas las hojas sumables, contando ambos jueces donde aplica. */
export function totalCompilatorio(sheets: SheetDef[] = SHEETS): number {
  return sheets
    .filter((s) => s.countsTowardTotal)
    .reduce((sum, s) => sum + maxPointsOf(s) * s.judgeSlots, 0);
}

/** Número de renglones de la "Hoja de Sumatoria Total" (16 sumables + Comandante). */
export function sumatoriaRowCount(sheets: SheetDef[] = SHEETS): number {
  return sheets.reduce((n, s) => n + s.judgeSlots, 0);
}
