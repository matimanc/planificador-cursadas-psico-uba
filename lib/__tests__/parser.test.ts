import { describe, expect, it } from "vitest";
import { parseCatedraText } from "../parser";
import { PHUL_CATEDRA_TEXT } from "./fixtures";

const opts = {
  subjectId: "juridica",
  subjectName: "Jurídica",
  catedraId: "phul",
  catedraLabel: "Phul",
};

describe("parseCatedraText", () => {
  const result = parseCatedraText(PHUL_CATEDRA_TEXT, opts);

  it("extracts all 7 teóricos and 24 comisiones with no unparsed rows", () => {
    expect(result.errors).toHaveLength(0);
    expect(result.teoricos).toHaveLength(7);
    expect(result.comisiones).toHaveLength(24);
  });

  it("parses teórico identifiers as roman numerals in order", () => {
    expect(result.teoricos.map((t) => t.identifier)).toEqual([
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
    ]);
  });

  it("normalizes day and time correctly for a teórico", () => {
    const t1 = result.teoricos[0];
    expect(t1.day).toBe("martes");
    expect(t1.start).toBe("14:30");
    expect(t1.end).toBe("16:00");
    expect(t1.professor).toBe("Izcurdia, María De Los Ángeles");
    expect(t1.room).toBe("HY-029");
  });

  it("maps Oblig. to the corresponding teórico identifier for comisiones", () => {
    const c1 = result.comisiones.find((c) => c.identifier === "1")!;
    expect(c1.oblig).toBe("V");
    expect(c1.day).toBe("miercoles");
    expect(c1.professor).toBe("Palestrini, Gabriela Paola");
    expect(c1.vacancies).toBe("25");
    expect(c1.room).toBe("HY-004");
  });

  it("strips a lone '.' observación instead of treating it as data", () => {
    const c2 = result.comisiones.find((c) => c.identifier === "2")!;
    expect(c2.observ).toBe("");
    expect(c2.room).toBe("HY-027");
  });

  it("every comisión's Oblig. matches an existing teórico identifier", () => {
    const teoricoIds = new Set(result.teoricos.map((t) => t.identifier));
    for (const c of result.comisiones) {
      expect(teoricoIds.has(c.oblig)).toBe(true);
    }
  });

  it("flags unparseable rows instead of silently dropping them", () => {
    const withGarbage = parseCatedraText(
      `Teóricos     Dia     Inicio     Fin     Tipo     Profesor
 I    martes     14:30     16:00     Teo    Someone
 this line has no day or times at all`,
      opts
    );
    expect(withGarbage.teoricos).toHaveLength(1);
    expect(withGarbage.errors).toHaveLength(1);
  });
});
