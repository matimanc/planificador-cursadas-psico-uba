export type BlockKind = "teorico" | "practico";

export type TeoricoPriority = "fundamental" | "low";

export interface ScheduleBlock {
  id: string;
  subjectId: string;
  subjectName: string;
  catedraId: string;
  catedraLabel: string;
  kind: BlockKind;
  identifier: string;
  day: string;
  start: string;
  end: string;
  professor: string;
  vacancies: string;
  oblig: string;
  room: string;
  observ: string;
  priority: TeoricoPriority;
}

export interface ParseRowError {
  raw: string;
  reason: string;
}

export interface ParsedCatedra {
  teoricos: ScheduleBlock[];
  comisiones: ScheduleBlock[];
  errors: ParseRowError[];
}

export interface Catedra {
  id: string;
  label: string;
  rawText: string;
  parsed: ParsedCatedra | null;
}

export interface Subject {
  id: string;
  name: string;
  hasMultipleCatedras: boolean;
  catedras: Catedra[];
  /**
   * Overrides the default "fundamental" priority per teórico identifier
   * (e.g. "III" -> "low"). Missing entries default to "fundamental".
   */
  teoricoPriorities: Record<string, TeoricoPriority>;
}

export interface FixedSubjectCriteria {
  subjectId: string;
  day: string;
}

export interface Criteria {
  idealDays: number;
  minStartTime: string;
  maxEndTime: string;
  maxGapMinutes: number;
  groupPracticosFirst: boolean;
  fixedSubject: FixedSubjectCriteria | null;
}

export interface PlanBlock extends ScheduleBlock {
  isOverlapWarning: boolean;
}

export interface Plan {
  id: string;
  blocks: PlanBlock[];
  daysUsed: string[];
  score: number;
  warnings: string[];
  rankingExplanation: string;
}

export interface GenerationResult {
  plans: Plan[];
  blockedSubjects: { subjectId: string; subjectName: string; reason: string }[];
  relaxationNotes: string[];
}

export const DAY_ORDER = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

export function normalizeDay(day: string): string {
  return day
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
