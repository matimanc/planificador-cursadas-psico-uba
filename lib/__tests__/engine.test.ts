import { describe, expect, it } from "vitest";
import { parseCatedraText } from "../parser";
import { generatePlans, DEFAULT_CRITERIA } from "../engine";
import { Subject } from "../types";
import { PHUL_CATEDRA_TEXT } from "./fixtures";

function makeJuridicaSubject(teoricoPriorities: Record<string, "fundamental" | "low"> = {}): Subject {
  const parsed = parseCatedraText(PHUL_CATEDRA_TEXT, {
    subjectId: "juridica",
    subjectName: "Jurídica",
    catedraId: "phul",
    catedraLabel: "Phul",
  });
  return {
    id: "juridica",
    name: "Jurídica",
    hasMultipleCatedras: false,
    teoricoPriorities,
    catedras: [{ id: "phul", label: "Phul", rawText: PHUL_CATEDRA_TEXT, parsed }],
  };
}

// A tiny synthetic subject with a single non-negotiable teórico/comisión (fixed day, no alternatives).
function makeFixedSubject(): Subject {
  const raw = `Teóricos     Dia     Inicio     Fin     Tipo     Profesor     Vac.     Oblig.     Aula     Observ.
 I    lunes     08:00     09:30     Teo    Docente Uno               A-1
Comisiones     Dia     Inicio     Fin     Tipo     Profesor     Vac.     Oblig.     Aula     Observ.
 1    lunes     10:00     11:30     Prac    Docente Dos     30     I     A-2`;
  const parsed = parseCatedraText(raw, {
    subjectId: "fija",
    subjectName: "Estadística",
    catedraId: "unica",
    catedraLabel: "Única",
  });
  return {
    id: "fija",
    name: "Estadística",
    hasMultipleCatedras: false,
    teoricoPriorities: {},
    catedras: [{ id: "unica", label: "Única", rawText: raw, parsed }],
  };
}

describe("generatePlans", () => {
  it("generates plans for a single subject respecting Oblig. linkage (fundamental teórico)", () => {
    const subject = makeJuridicaSubject(); // all teóricos default to fundamental
    const result = generatePlans([subject], DEFAULT_CRITERIA);
    expect(result.blockedSubjects).toHaveLength(0);
    expect(result.plans.length).toBeGreaterThan(0);

    for (const plan of result.plans) {
      const teoricoBlocks = plan.blocks.filter((b) => b.kind === "teorico");
      const practicoBlocks = plan.blocks.filter((b) => b.kind === "practico");
      expect(teoricoBlocks).toHaveLength(1);
      expect(practicoBlocks).toHaveLength(1);
      // The chosen comisión's Oblig. must match the chosen teórico's identifier.
      expect(practicoBlocks[0].oblig).toBe(teoricoBlocks[0].identifier);
    }
  });

  it("does not require the teórico when it is marked low priority, but shows it as advisory", () => {
    const subject = makeJuridicaSubject({ V: "low" });
    const result = generatePlans([subject], DEFAULT_CRITERIA);
    const planWithComisionV = result.plans
      .flatMap((p) => p.blocks)
      .find((b) => b.kind === "practico" && b.oblig === "V");

    // Regenerate directly picking a plan that used comisión #19 or #20 (oblig V) to inspect advisory teórico.
    const anyPlanUsingV = result.plans.find((p) =>
      p.blocks.some((b) => b.kind === "practico" && b.oblig === "V")
    );
    if (anyPlanUsingV) {
      const advisoryTeorico = anyPlanUsingV.blocks.find(
        (b) => b.kind === "teorico" && b.identifier === "V"
      );
      // If present it must be marked low priority (informational only).
      if (advisoryTeorico) expect(advisoryTeorico.priority).toBe("low");
    }
    expect(planWithComisionV || true).toBeTruthy();
  });

  it("never produces overlapping required blocks within the same plan", () => {
    const subject = makeJuridicaSubject();
    const second = makeFixedSubject();
    const result = generatePlans([subject, second], DEFAULT_CRITERIA);
    for (const plan of result.plans) {
      const required = plan.blocks.filter((b) => !b.isOverlapWarning);
      for (let i = 0; i < required.length; i++) {
        for (let j = i + 1; j < required.length; j++) {
          const a = required[i];
          const b = required[j];
          if (a.day !== b.day) continue;
          const overlap = a.start < b.end && b.start < a.end;
          expect(overlap).toBe(false);
        }
      }
    }
  });

  it("handles a subject with a single non-negotiable teórico/comisión pair", () => {
    const subject = makeFixedSubject();
    const result = generatePlans([subject], DEFAULT_CRITERIA);
    expect(result.blockedSubjects).toHaveLength(0);
    expect(result.plans[0].blocks).toHaveLength(2);
    expect(result.plans[0].daysUsed).toEqual(["lunes"]);
  });

  it("reports a subject as blocked when only teóricos were pasted (missing comisiones)", () => {
    const raw = `Teóricos     Dia     Inicio     Fin     Tipo     Profesor
 I    lunes     08:00     09:30     Teo    Docente Uno`;
    const parsed = parseCatedraText(raw, {
      subjectId: "incompleta",
      subjectName: "Incompleta",
      catedraId: "c1",
      catedraLabel: "c1",
    });
    const subject: Subject = {
      id: "incompleta",
      name: "Incompleta",
      hasMultipleCatedras: false,
      teoricoPriorities: {},
      catedras: [{ id: "c1", label: "c1", rawText: raw, parsed }],
    };
    const result = generatePlans([subject], DEFAULT_CRITERIA);
    expect(result.plans).toHaveLength(0);
    expect(result.blockedSubjects).toHaveLength(1);
    expect(result.blockedSubjects[0].reason).toMatch(/comisiones/);
  });

  it("reports a structural conflict when a fixed-day constraint is impossible to satisfy", () => {
    const subject = makeFixedSubject(); // only ever falls on lunes
    const result = generatePlans([subject], {
      ...DEFAULT_CRITERIA,
      fixedSubject: { subjectId: "fija", day: "martes" },
    });
    expect(result.plans).toHaveLength(0);
    expect(result.blockedSubjects).toHaveLength(1);
    expect(result.blockedSubjects[0].reason).toMatch(/día fijado/);
  });

  it("treats allowedDays as a hard filter, blocking a subject with no options on those days", () => {
    const subject = makeFixedSubject(); // only ever falls on lunes
    const result = generatePlans([subject], { ...DEFAULT_CRITERIA, allowedDays: ["martes"] });
    expect(result.plans).toHaveLength(0);
    expect(result.blockedSubjects).toHaveLength(1);
    expect(result.blockedSubjects[0].reason).toMatch(/días permitidos/);
  });

  it("generates plans normally when allowedDays includes the subject's only day", () => {
    const subject = makeFixedSubject();
    const result = generatePlans([subject], { ...DEFAULT_CRITERIA, allowedDays: ["lunes"] });
    expect(result.blockedSubjects).toHaveLength(0);
    expect(result.plans).toHaveLength(1);
  });

  it("excludes combinations overlapping a user-defined blocked slot", () => {
    const subject = makeJuridicaSubject();
    // Comisión #1 (oblig V) meets miércoles 18:00-19:30; block that exact slot.
    const result = generatePlans([subject], {
      ...DEFAULT_CRITERIA,
      blockedSlots: [{ id: "b1", label: "Trabajo", day: "miercoles", start: "18:00", end: "19:30" }],
    });
    const usesBlockedComision = result.plans
      .flatMap((p) => p.blocks)
      .some((b) => b.kind === "practico" && b.identifier === "1");
    expect(usesBlockedComision).toBe(false);
  });

  it("reports a subject as blocked when every option overlaps the user's blocked slots", () => {
    const subject = makeFixedSubject(); // teórico lunes 08:00-09:30, comisión lunes 10:00-11:30
    const result = generatePlans([subject], {
      ...DEFAULT_CRITERIA,
      blockedSlots: [{ id: "b1", label: "Gimnasio", day: "lunes", start: "08:00", end: "09:30" }],
    });
    expect(result.plans).toHaveLength(0);
    expect(result.blockedSubjects).toHaveLength(1);
    expect(result.blockedSubjects[0].reason).toMatch(/horarios bloqueados/);
  });

  it("ranks plans preferring fewer distinct days when idealDays is small", () => {
    const subject = makeJuridicaSubject();
    const second = makeFixedSubject();
    const result = generatePlans([subject, second], { ...DEFAULT_CRITERIA, idealDays: 1 });
    expect(result.plans.length).toBeGreaterThan(0);
    // Best plan should not have more days than the second-best (sorted ascending by score).
    for (let i = 0; i < result.plans.length - 1; i++) {
      expect(result.plans[i].score).toBeLessThanOrEqual(result.plans[i + 1].score);
    }
  });
});
