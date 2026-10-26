import { describe, expect, it } from "vitest";
import {
  CONVOCATORIA_PDF,
  MAX_PER_CRITERION,
  SCORE_SCALE,
  SHEETS,
  TOTAL_PDF,
  buildCatalog,
  criteriaFor,
  sumatoriaRowCount,
  totalCompilatorio,
} from "./sheets";

/**
 * Máximos impresos en cada hoja del PDF, para la convocatoria del 2º
 * Encuentro (3 toques, 1 marcha). Si una transcripción pierde o duplica un
 * criterio, el máximo deja de cuadrar y esta prueba lo detecta.
 */
const MAX_IMPRESO: Record<string, number> = {
  revista_personal: 45,
  revista_caja: 50,
  revista_corneta: 30,
  orden_cerrado: 40,
  toques_cajeros: 60,
  toques_cornetas: 60,
  marcha_cajas: 25,
  marcha_cornetas: 25,
  rutina_cajeros: 40,
  rutina_cornetas: 40,
  comandante: 40,
};

const pdf = buildCatalog(CONVOCATORIA_PDF);

describe("catálogo de hojas", () => {
  it("contiene las 11 plantillas del reglamento", () => {
    expect(SHEETS).toHaveLength(11);
    expect(SHEETS.map((s) => s.code).sort()).toEqual(
      Object.keys(MAX_IMPRESO).sort(),
    );
  });

  it("no repite códigos", () => {
    const codes = SHEETS.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("cada hoja define criterios fijos o una repetición, no ambos", () => {
    for (const s of SHEETS) {
      expect(Boolean(s.criteria) !== Boolean(s.repeat)).toBe(true);
    }
  });

  it.each(pdf)("«$name» suma el máximo impreso en la hoja", (sheet) => {
    expect(sheet.maxPoints).toBe(MAX_IMPRESO[sheet.code]);
  });

  it("ningún criterio queda sin texto", () => {
    for (const sheet of pdf) {
      for (const c of sheet.criteria) {
        expect(c.label.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe("convocatoria del PDF (3 toques, 1 marcha)", () => {
  it("el total compilatorio es 665", () => {
    expect(totalCompilatorio(CONVOCATORIA_PDF)).toBe(TOTAL_PDF);
    expect(totalCompilatorio()).toBe(665);
  });

  it("la Sumatoria tiene 16 renglones sumables + Comandante", () => {
    expect(sumatoriaRowCount(pdf.filter((s) => s.countsTowardTotal))).toBe(16);
    expect(sumatoriaRowCount(pdf)).toBe(17);
  });

  it("las hojas de toques traen 3 toques de 4 aspectos cada uno", () => {
    for (const code of ["toques_cajeros", "toques_cornetas"]) {
      const sheet = pdf.find((s) => s.code === code)!;
      expect(sheet.criteria).toHaveLength(12);
      for (const n of [1, 2, 3]) {
        expect(
          sheet.criteria.filter((c) => c.section === `TOQUE ${n}`),
        ).toHaveLength(4);
      }
    }
  });

  it("Revista de Personal se divide en PERSONAL (4) y UNIFORME (5)", () => {
    const sheet = pdf.find((s) => s.code === "revista_personal")!;
    const porSeccion = (s: string) =>
      sheet.criteria.filter((c) => c.section === s).length;
    expect(porSeccion("PERSONAL")).toBe(4);
    expect(porSeccion("UNIFORME")).toBe(5);
  });

  it("las rutinas libres penalizan el tiempo de marcha", () => {
    for (const code of ["rutina_cajeros", "rutina_cornetas"]) {
      const sheet = pdf.find((s) => s.code === code)!;
      const tiempo = sheet.criteria.at(-1)!;
      expect(tiempo.label).toBe("TIEMPO DE MARCHA");
      expect(tiempo.deductionHint).toMatch(/10 seg/);
    }
  });
});

describe("convocatorias distintas", () => {
  it("más toques suben el total", () => {
    // Cada toque de más añade 4 criterios × 5 pts × 2 hojas × 2 jueces = 80.
    expect(totalCompilatorio({ toques: 4, marchas: 1 })).toBe(665 + 80);
    expect(totalCompilatorio({ toques: 2, marchas: 1 })).toBe(665 - 80);
  });

  it("más marchas suben el total", () => {
    // Cada marcha de más añade 5 criterios × 5 pts × 2 hojas × 2 jueces = 100.
    expect(totalCompilatorio({ toques: 3, marchas: 2 })).toBe(665 + 100);
  });

  it("las hojas fijas no cambian con la convocatoria", () => {
    const otra = buildCatalog({ toques: 5, marchas: 3 });
    for (const code of ["revista_personal", "orden_cerrado", "comandante"]) {
      expect(otra.find((s) => s.code === code)!.maxPoints).toBe(
        MAX_IMPRESO[code],
      );
    }
  });

  it("el número de renglones de la Sumatoria no depende de la convocatoria", () => {
    // Cambian los criterios por hoja, no cuántas hojas hay.
    expect(sumatoriaRowCount(buildCatalog({ toques: 5, marchas: 3 }))).toBe(17);
  });

  it("una convocatoria con una sola marcha y un solo toque sigue cuadrando", () => {
    const chica = buildCatalog({ toques: 1, marchas: 1 });
    expect(chica.find((s) => s.code === "toques_cajeros")!.maxPoints).toBe(20);
    expect(chica.find((s) => s.code === "marcha_cajas")!.maxPoints).toBe(25);
  });

  it("las secciones se numeran desde 1", () => {
    const sheet = SHEETS.find((s) => s.code === "marcha_cajas")!;
    const criterios = criteriaFor(sheet, { toques: 3, marchas: 2 });
    expect(criterios).toHaveLength(10);
    expect(criterios[0].section).toBe("MARCHA 1");
    expect(criterios.at(-1)!.section).toBe("MARCHA 2");
  });
});

describe("escala de calificación", () => {
  it("va de 0.5 a 5.0 en pasos de 0.5", () => {
    expect(SCORE_SCALE).toHaveLength(10);
    expect(Math.max(...SCORE_SCALE)).toBe(MAX_PER_CRITERION);
    expect(Math.min(...SCORE_SCALE)).toBe(0.5);
    expect([...SCORE_SCALE]).toEqual([...SCORE_SCALE].sort((a, b) => b - a));
    for (const v of SCORE_SCALE) {
      expect((v * 10) % 5).toBe(0);
    }
  });
});
