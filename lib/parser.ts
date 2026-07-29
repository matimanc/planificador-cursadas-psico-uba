import { ParsedCatedra, ParseRowError, ScheduleBlock, normalizeDay } from "./types";

const TEORICOS_HEADER_RE = /^\s*teo/i;
const COMISIONES_HEADER_RE = /^\s*(comision|comisiones|practico|practicos)/i;
const TIME_RE = /^\d{1,2}:\d{2}$/;

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

type Section = "teoricos" | "comisiones" | null;

function splitTokens(line: string): string[] {
  return line
    .split(/\t+| {2,}/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function normalizeTime(raw: string): string | null {
  const t = raw.trim();
  if (!TIME_RE.test(t)) return null;
  const [h, m] = t.split(":");
  return `${h.padStart(2, "0")}:${m}`;
}

function detectSection(line: string): Section {
  const plain = stripDiacritics(line.trim());
  if (TEORICOS_HEADER_RE.test(plain)) return "teoricos";
  if (COMISIONES_HEADER_RE.test(plain)) return "comisiones";
  return null;
}

function isHeaderRow(tokens: string[]): boolean {
  const joined = tokens.join(" ").toLowerCase();
  return (
    joined.includes("dia") &&
    (joined.includes("inicio") || joined.includes("fin")) &&
    !TIME_RE.test(tokens[1] ?? "")
  );
}

/**
 * Parses one raw block of pasted text (a single cátedra) that may contain a
 * "Teóricos" section and a "Comisiones"/"Prácticos" section.
 */
export function parseCatedraText(
  rawText: string,
  opts: { subjectId: string; subjectName: string; catedraId: string; catedraLabel: string }
): ParsedCatedra {
  const teoricos: ScheduleBlock[] = [];
  const comisiones: ScheduleBlock[] = [];
  const errors: ParseRowError[] = [];

  let currentSection: Section = null;
  let blockCounter = 0;

  const lines = rawText.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.replace(/^"|"$/g, "");
    if (!line.trim()) continue;

    const detected = detectSection(line);
    if (detected) {
      currentSection = detected;
      continue;
    }

    if (!currentSection) {
      // No section header seen yet: try to infer from row shape once we see data.
      continue;
    }

    const tokens = splitTokens(line);
    if (tokens.length === 0) continue;
    if (isHeaderRow(tokens)) continue;

    const row = parseDataRow(tokens);
    if (!row) {
      errors.push({ raw: rawLine, reason: "No se pudo identificar día y horarios en la fila." });
      continue;
    }

    blockCounter += 1;
    const kind = currentSection === "teoricos" ? "teorico" : "practico";
    const block: ScheduleBlock = {
      id: `${opts.catedraId}-${kind}-${blockCounter}`,
      subjectId: opts.subjectId,
      subjectName: opts.subjectName,
      catedraId: opts.catedraId,
      catedraLabel: opts.catedraLabel,
      kind,
      identifier: row.identifier,
      day: normalizeDay(row.day),
      start: row.start,
      end: row.end,
      professor: row.professor,
      vacancies: row.vacancies,
      oblig: row.oblig,
      room: row.room,
      observ: row.observ,
      priority: "fundamental",
    };

    if (kind === "teorico") teoricos.push(block);
    else comisiones.push(block);
  }

  return { teoricos, comisiones, errors };
}

interface DataRow {
  identifier: string;
  day: string;
  start: string;
  end: string;
  professor: string;
  vacancies: string;
  oblig: string;
  room: string;
  observ: string;
}

/**
 * Locates the two consecutive HH:MM tokens (start/end) in the row and infers
 * the remaining columns positionally around them. This tolerates minor
 * reordering/omission of trailing columns (vacancies, oblig, room, observ)
 * which vary across source systems.
 */
function parseDataRow(tokens: string[]): DataRow | null {
  let timeIdx = -1;
  for (let i = 0; i < tokens.length - 1; i++) {
    const start = normalizeTime(tokens[i]);
    const end = normalizeTime(tokens[i + 1]);
    if (start && end) {
      timeIdx = i;
      break;
    }
  }
  if (timeIdx === -1) return null;

  const start = normalizeTime(tokens[timeIdx])!;
  const end = normalizeTime(tokens[timeIdx + 1])!;

  const before = tokens.slice(0, timeIdx); // expect: [identifier, day]
  if (before.length === 0) return null;
  const day = before[before.length - 1];
  const identifier = before.length > 1 ? before[0] : "";

  const after = tokens.slice(timeIdx + 2); // expect: [tipo, profesor, vac?, oblig?, aula?, observ?]
  let idx = 0;
  if (after[idx] && /^(teo|pr[aá]c)/i.test(after[idx])) {
    idx += 1; // skip tipo, we already know it from the section
  }
  const professor = after[idx] ?? "";
  idx += 1;

  const rest = after.slice(idx);
  // Heuristic: vacancies is a bare number, oblig is a roman numeral or number,
  // room usually starts with letters, observ is whatever's left (often "." or empty).
  let vacancies = "";
  let oblig = "";
  let room = "";
  let observ = "";

  const isRoman = (s: string) => /^[IVXLCDM]+$/i.test(s);
  const isNumeric = (s: string) => /^\d+$/.test(s);
  const isDotOnly = (s: string) => s === "." || s === "-";

  let ri = 0;
  if (rest[ri] && isNumeric(rest[ri])) {
    vacancies = rest[ri];
    ri += 1;
  }
  if (rest[ri] && (isRoman(rest[ri]) || isNumeric(rest[ri]))) {
    oblig = rest[ri];
    ri += 1;
  }
  if (rest[ri] && !isDotOnly(rest[ri])) {
    room = rest[ri];
    ri += 1;
  }
  if (rest[ri]) {
    observ = isDotOnly(rest[ri]) ? "" : rest[ri];
  }

  if (!day) return null;

  return {
    identifier,
    day,
    start,
    end,
    professor,
    vacancies,
    oblig,
    room,
    observ,
  };
}
