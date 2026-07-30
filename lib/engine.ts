import {
  BlockedSlot,
  Criteria,
  GenerationResult,
  Plan,
  PlanBlock,
  ScheduleBlock,
  Subject,
  TeoricoPriority,
} from "./types";

interface SubjectOption {
  subjectId: string;
  subjectName: string;
  catedraId: string;
  requiredBlocks: ScheduleBlock[];
  advisoryBlocks: ScheduleBlock[];
  /** Comisiones intercambiables (mismo día/horario/teórico vinculado) representadas por requiredBlocks[práctico]. */
  comisionAlternatives: ScheduleBlock[];
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

interface TimedBlock {
  day: string;
  start: string;
  end: string;
}

function blocksOverlap(a: TimedBlock, b: TimedBlock): boolean {
  if (a.day !== b.day) return false;
  const aStart = timeToMinutes(a.start);
  const aEnd = timeToMinutes(a.end);
  const bStart = timeToMinutes(b.start);
  const bEnd = timeToMinutes(b.end);
  return aStart < bEnd && bStart < aEnd;
}

function applyAllowedDays(options: SubjectOption[], allowedDays: string[] | null): SubjectOption[] {
  if (!allowedDays || allowedDays.length === 0) return options;
  return options.filter((opt) => opt.requiredBlocks.every((b) => allowedDays.includes(b.day)));
}

function applyBlockedSlots(options: SubjectOption[], blockedSlots: BlockedSlot[]): SubjectOption[] {
  if (blockedSlots.length === 0) return options;
  return options.filter((opt) =>
    opt.requiredBlocks.every((b) => !blockedSlots.some((slot) => blocksOverlap(b, slot)))
  );
}

/**
 * Builds, per subject, the list of mutually-exclusive ways to attend it
 * (one option per comisión, each carrying whichever teórico blocks are
 * required vs merely advisory depending on the subject's teórico priority).
 */
function buildSubjectOptions(subject: Subject): {
  options: SubjectOption[];
  blockedReason: string | null;
} {
  const options: SubjectOption[] = [];
  let anyTeoricos = false;
  let anyComisiones = false;

  for (const catedra of subject.catedras) {
    const parsed = catedra.parsed;
    if (!parsed) continue;
    if (parsed.teoricos.length > 0) anyTeoricos = true;
    if (parsed.comisiones.length > 0) anyComisiones = true;

    const teoricosById = new Map(parsed.teoricos.map((t) => [t.identifier, t]));
    const lonelyTeorico = parsed.teoricos.length === 1 ? parsed.teoricos[0] : null;

    const priorityOf = (identifier: string): TeoricoPriority =>
      subject.teoricoPriorities[identifier] ?? "fundamental";

    interface ComisionCandidate {
      comision: ScheduleBlock;
      matchedTeorico?: ScheduleBlock;
      isFundamental: boolean;
    }

    const candidates: ComisionCandidate[] = parsed.comisiones.map((comision) => {
      const matchedTeorico = teoricosById.get(comision.oblig) ?? lonelyTeorico ?? undefined;
      const isFundamental = !!matchedTeorico && priorityOf(matchedTeorico.identifier) === "fundamental";
      return { comision, matchedTeorico, isFundamental };
    });

    // Group comisiones that occupy the exact same day/time and are linked to
    // the same teórico (or none): they're interchangeable choices for the
    // same time slot, so they become a single option instead of separate
    // near-duplicate plans.
    const groups = new Map<string, ComisionCandidate[]>();
    for (const c of candidates) {
      const teoricoKey = c.matchedTeorico ? c.matchedTeorico.identifier : "none";
      const key = `${c.comision.day}|${c.comision.start}|${c.comision.end}|${teoricoKey}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }

    for (const group of groups.values()) {
      const [first] = group;
      const comisionAlternatives = group.map((g) => g.comision);

      if (first.isFundamental && first.matchedTeorico) {
        options.push({
          subjectId: subject.id,
          subjectName: subject.name,
          catedraId: catedra.id,
          requiredBlocks: [first.matchedTeorico, first.comision],
          advisoryBlocks: [],
          comisionAlternatives,
        });
      } else {
        options.push({
          subjectId: subject.id,
          subjectName: subject.name,
          catedraId: catedra.id,
          requiredBlocks: [first.comision],
          advisoryBlocks: first.matchedTeorico ? [{ ...first.matchedTeorico, priority: "low" }] : [],
          comisionAlternatives,
        });
      }
    }
  }

  if (!anyTeoricos && !anyComisiones) {
    return { options: [], blockedReason: "no se cargaron horarios (materia vacía)." };
  }
  if (anyTeoricos && !anyComisiones) {
    return { options: [], blockedReason: "faltan las comisiones de práctico." };
  }
  if (!anyTeoricos && anyComisiones) {
    return { options: [], blockedReason: "faltan los teóricos." };
  }
  if (options.length === 0) {
    return {
      options: [],
      blockedReason:
        "ninguna comisión pudo vincularse a un teórico fundamental vía el campo Oblig.",
    };
  }

  return { options, blockedReason: null };
}

function applyFixedSubject(
  options: SubjectOption[],
  fixedDay: string
): SubjectOption[] {
  return options.filter((opt) => opt.requiredBlocks.every((b) => b.day === fixedDay));
}

interface Combination {
  chosen: SubjectOption[];
}

const MAX_VALID_COMBINATIONS = 3000;
const MAX_ITERATIONS = 400000;

function generateCombinations(
  subjectsOptions: { subjectId: string; options: SubjectOption[] }[]
): Combination[] {
  const results: Combination[] = [];
  let iterations = 0;

  // Most-constrained-first ordering speeds up pruning.
  const ordered = [...subjectsOptions].sort((a, b) => a.options.length - b.options.length);

  function backtrack(index: number, chosen: SubjectOption[]) {
    if (results.length >= MAX_VALID_COMBINATIONS || iterations >= MAX_ITERATIONS) return;
    if (index === ordered.length) {
      results.push({ chosen: [...chosen] });
      return;
    }
    for (const opt of ordered[index].options) {
      iterations += 1;
      if (iterations >= MAX_ITERATIONS) return;
      const conflicts = chosen.some((prev) =>
        prev.requiredBlocks.some((pb) => opt.requiredBlocks.some((ob) => blocksOverlap(pb, ob)))
      );
      if (conflicts) continue;
      chosen.push(opt);
      backtrack(index + 1, chosen);
      chosen.pop();
      if (results.length >= MAX_VALID_COMBINATIONS) return;
    }
  }

  backtrack(0, []);
  return results;
}

function daysUsedOf(combination: Combination): string[] {
  const days = new Set<string>();
  for (const opt of combination.chosen) {
    for (const b of opt.requiredBlocks) days.add(b.day);
  }
  return [...days];
}

function scoreCombination(
  combination: Combination,
  criteria: Criteria
): { score: number; warnings: string[] } {
  const warnings: string[] = [];
  const days = daysUsedOf(combination);
  const dayDiff = Math.abs(days.length - criteria.idealDays);

  const minStart = timeToMinutes(criteria.minStartTime);
  const maxEnd = timeToMinutes(criteria.maxEndTime);

  let rangeViolations = 0;
  const byDay = new Map<string, ScheduleBlock[]>();
  for (const opt of combination.chosen) {
    for (const b of opt.requiredBlocks) {
      const s = timeToMinutes(b.start);
      const e = timeToMinutes(b.end);
      if (s < minStart || e > maxEnd) rangeViolations += 1;
      if (!byDay.has(b.day)) byDay.set(b.day, []);
      byDay.get(b.day)!.push(b);
    }
  }

  let gapPenalty = 0;
  for (const dayBlocks of byDay.values()) {
    const sorted = [...dayBlocks].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = timeToMinutes(sorted[i + 1].start) - timeToMinutes(sorted[i].end);
      if (gap < 0) continue; // overlaps within same subject shouldn't happen; ignore defensively
      const bothPracticos = sorted[i].kind === "practico" && sorted[i + 1].kind === "practico";
      const weight = criteria.groupPracticosFirst && bothPracticos ? 2 : 1;
      if (gap > criteria.maxGapMinutes) {
        gapPenalty += (gap - criteria.maxGapMinutes) * weight;
      }
    }
  }

  // Advisory (low-priority) teóricos: check overlap against required blocks and flag warnings.
  const allRequired = combination.chosen.flatMap((o) => o.requiredBlocks);
  for (const opt of combination.chosen) {
    for (const adv of opt.advisoryBlocks) {
      const overlapsSomething = allRequired.some((rb) => rb !== adv && blocksOverlap(rb, adv));
      if (overlapsSomething) {
        warnings.push(
          `El teórico "a evaluar" ${adv.identifier} de ${opt.subjectName} se superpone con otro bloque confirmado.`
        );
      }
    }
  }

  const score = dayDiff * 100000 + rangeViolations * 5000 + gapPenalty + warnings.length * 50;
  return { score, warnings };
}

function toPlanBlocks(combination: Combination): PlanBlock[] {
  const allRequired = combination.chosen.flatMap((o) => o.requiredBlocks);
  const blocks: PlanBlock[] = [];
  for (const opt of combination.chosen) {
    // The subject's name may have been edited after these blocks were parsed;
    // always display the current name instead of whatever was baked in then.
    const withCurrentName = (b: ScheduleBlock): ScheduleBlock => ({ ...b, subjectName: opt.subjectName });

    for (const b of opt.requiredBlocks) {
      const equivalentOptions = (b.kind === "practico" ? opt.comisionAlternatives : [b]).map(
        withCurrentName
      );
      blocks.push({ ...withCurrentName(b), isOverlapWarning: false, equivalentOptions });
    }
    for (const adv of opt.advisoryBlocks) {
      const isOverlapWarning = allRequired.some((rb) => blocksOverlap(rb, adv));
      const namedAdv = withCurrentName(adv);
      blocks.push({ ...namedAdv, isOverlapWarning, equivalentOptions: [namedAdv] });
    }
  }
  return blocks;
}

function buildRelaxationNote(
  bestDays: number,
  criteria: Criteria,
  subjectsOptions: { subjectId: string; subjectName: string; options: SubjectOption[] }[]
): string[] {
  if (bestDays <= criteria.idealDays) return [];
  const notes: string[] = [];

  for (const s of subjectsOptions) {
    const daysForSubject = new Set(s.options.flatMap((o) => o.requiredBlocks.map((b) => b.day)));
    if (daysForSubject.size <= 1) continue;
    // Subject whose every option touches a different day than the rest is a likely bottleneck.
    notes.push(
      `"${s.subjectName}" tiene comisiones repartidas en ${daysForSubject.size} días distintos (${[...daysForSubject].join(", ")}), lo que puede impedir llegar a ${criteria.idealDays} día(s) en total.`
    );
  }

  return notes.slice(0, 3);
}

export function generatePlans(subjects: Subject[], criteria: Criteria): GenerationResult {
  const blockedSubjects: GenerationResult["blockedSubjects"] = [];
  const subjectsOptions: { subjectId: string; subjectName: string; options: SubjectOption[] }[] =
    [];

  for (const subject of subjects) {
    const { options, blockedReason } = buildSubjectOptions(subject);
    if (blockedReason) {
      blockedSubjects.push({ subjectId: subject.id, subjectName: subject.name, reason: blockedReason });
      continue;
    }
    let finalOptions = options;
    if (criteria.fixedSubject && criteria.fixedSubject.subjectId === subject.id) {
      finalOptions = applyFixedSubject(options, criteria.fixedSubject.day);
      if (finalOptions.length === 0) {
        blockedSubjects.push({
          subjectId: subject.id,
          subjectName: subject.name,
          reason: `no tiene ninguna combinación de teórico/comisión que caiga enteramente el día fijado (${criteria.fixedSubject.day}).`,
        });
        continue;
      }
    }

    const afterAllowedDays = applyAllowedDays(finalOptions, criteria.allowedDays);
    if (afterAllowedDays.length === 0) {
      blockedSubjects.push({
        subjectId: subject.id,
        subjectName: subject.name,
        reason: `no tiene ninguna combinación de teórico/comisión que caiga dentro de los días permitidos (${criteria.allowedDays?.join(", ")}).`,
      });
      continue;
    }
    finalOptions = afterAllowedDays;

    const afterBlockedSlots = applyBlockedSlots(finalOptions, criteria.blockedSlots);
    if (afterBlockedSlots.length === 0) {
      blockedSubjects.push({
        subjectId: subject.id,
        subjectName: subject.name,
        reason:
          "todas sus combinaciones posibles se superponen con tus horarios bloqueados (actividades personales o materias anuales).",
      });
      continue;
    }
    finalOptions = afterBlockedSlots;

    subjectsOptions.push({ subjectId: subject.id, subjectName: subject.name, options: finalOptions });
  }

  if (subjectsOptions.length === 0) {
    return { plans: [], blockedSubjects, relaxationNotes: [] };
  }

  const combinations = generateCombinations(
    subjectsOptions.map((s) => ({ subjectId: s.subjectId, options: s.options }))
  );

  if (combinations.length === 0) {
    return {
      plans: [],
      blockedSubjects,
      relaxationNotes: [
        "No se encontró ninguna combinación sin superposiciones entre las materias cargadas. Revisá los horarios o relajá los criterios.",
      ],
    };
  }

  const scored = combinations.map((combo) => {
    const { score, warnings } = scoreCombination(combo, criteria);
    return { combo, score, warnings, days: daysUsedOf(combo) };
  });

  scored.sort((a, b) => a.score - b.score);

  const bestDays = scored[0].days.length;
  const relaxationNotes = buildRelaxationNote(bestDays, criteria, subjectsOptions);

  const plans: Plan[] = scored.slice(0, 3).map((s, idx) => ({
    id: `plan-${idx + 1}`,
    blocks: toPlanBlocks(s.combo),
    daysUsed: s.days.sort(),
    score: s.score,
    warnings: s.warnings,
    rankingExplanation:
      s.days.length <= criteria.idealDays
        ? `Cursada en ${s.days.length} día(s), dentro del ideal configurado.`
        : `Cursada en ${s.days.length} día(s) (ideal: ${criteria.idealDays}). ${
            relaxationNotes[0] ?? ""
          }`,
  }));

  return { plans, blockedSubjects, relaxationNotes };
}

export const DEFAULT_CRITERIA: Criteria = {
  idealDays: 2,
  minStartTime: "08:00",
  maxEndTime: "23:00",
  maxGapMinutes: 20,
  groupPracticosFirst: true,
  fixedSubject: null,
  allowedDays: null,
  blockedSlots: [],
};
