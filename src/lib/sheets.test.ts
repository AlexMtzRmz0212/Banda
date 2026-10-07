import { describe, expect, it } from "vitest";
import {
  MAX_PER_CRITERION,
  SCORE_SCALE,
  SHEETS,
  TOTAL_COMPILATORIO,
  maxPointsOf,
  sumatoriaRowCount,
  totalCompilatorio,
} from "./sheets";

/**
 * Los máximos impresos en cada hoja del PDF. Si una transcripción pierde o
 * duplica un criterio, el máximo deja de cuadrar y esta prueba lo detecta.
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

  it.each(SHEETS)(
    "«$name» suma el máximo impreso en la hoja",
    (sheet) => {
      expect(maxPointsOf(sheet)).toBe(MAX_IMPRESO[sheet.code]);
    },
  );

  it("el total compilatorio es 665", () => {
    expect(totalCompilatorio()).toBe(TOTAL_COMPILATORIO);
    expect(totalCompilatorio()).toBe(665);
  });

  it("la Hoja de Sumatoria Total tiene 16 renglones sumables + Comandante", () => {
    const sumables = SHEETS.filter((s) => s.countsTowardTotal);
    expect(sumatoriaRowCount(sumables)).toBe(16);
    expect(sumatoriaRowCount()).toBe(17);
  });

  it("Comandante se califica pero no suma al total de la banda", () => {
    const comandante = SHEETS.find((s) => s.code === "comandante");
    expect(comandante?.countsTowardTotal).toBe(false);
    expect(maxPointsOf(comandante!)).toBe(40);

    // Quitarlo del catálogo no debe mover el compilatorio.
    const sinComandante = SHEETS.filter((s) => s.code !== "comandante");
    expect(totalCompilatorio(sinComandante)).toBe(665);
  });

  it("las hojas con Juez 1 y Juez 2 son exactamente las seis del PDF", () => {
    const dobles = SHEETS.filter((s) => s.judgeSlots === 2).map((s) => s.code);
    expect(dobles.sort()).toEqual(
      [
        "marcha_cajas",
        "marcha_cornetas",
        "rutina_cajeros",
        "rutina_cornetas",
        "toques_cajeros",
        "toques_cornetas",
      ].sort(),
    );
  });

  it("las hojas de toques traen 3 toques de 4 aspectos cada uno", () => {
    for (const code of ["toques_cajeros", "toques_cornetas"]) {
      const sheet = SHEETS.find((s) => s.code === code)!;
      expect(sheet.criteria).toHaveLength(12);
      for (const n of [1, 2, 3]) {
        const delToque = sheet.criteria.filter(
          (c) => c.section === `TOQUE ${n}`,
        );
        expect(delToque).toHaveLength(4);
      }
    }
  });

  it("Revista de Personal se divide en PERSONAL (4) y UNIFORME (5)", () => {
    const sheet = SHEETS.find((s) => s.code === "revista_personal")!;
    const porSeccion = (s: string) =>
      sheet.criteria.filter((c) => c.section === s).length;
    expect(porSeccion("PERSONAL")).toBe(4);
    expect(porSeccion("UNIFORME")).toBe(5);
  });

  it("ningún criterio queda sin texto", () => {
    for (const sheet of SHEETS) {
      for (const c of sheet.criteria) {
        expect(c.label.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("las rutinas libres penalizan el tiempo de marcha", () => {
    for (const code of ["rutina_cajeros", "rutina_cornetas"]) {
      const sheet = SHEETS.find((s) => s.code === code)!;
      const tiempo = sheet.criteria.at(-1)!;
      expect(tiempo.label).toBe("TIEMPO DE MARCHA");
      expect(tiempo.deductionHint).toMatch(/10 seg/);
    }
  });
});

describe("escala de calificación", () => {
  it("va de 0.5 a 5.0 en pasos de 0.5", () => {
    expect(SCORE_SCALE).toHaveLength(10);
    expect(Math.max(...SCORE_SCALE)).toBe(MAX_PER_CRITERION);
    expect(Math.min(...SCORE_SCALE)).toBe(0.5);
    // Impresa de mayor a menor, como en la hoja.
    expect([...SCORE_SCALE]).toEqual([...SCORE_SCALE].sort((a, b) => b - a));
    for (const v of SCORE_SCALE) {
      expect((v * 10) % 5).toBe(0);
    }
  });
});
