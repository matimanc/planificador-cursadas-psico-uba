import { ScheduleBlock } from "./types";

/** Junta una lista de strings al estilo español: "a", "a y b", "a, b y c". */
export function joinSpanish(items: string[]): string {
  const unique = [...new Set(items)];
  if (unique.length === 0) return "";
  if (unique.length === 1) return unique[0];
  return `${unique.slice(0, -1).join(", ")} y ${unique[unique.length - 1]}`;
}

export function formatIdentifiers(blocks: ScheduleBlock[]): string {
  return joinSpanish(blocks.map((b) => b.identifier));
}

export function formatProfessors(blocks: ScheduleBlock[]): string {
  return joinSpanish(blocks.map((b) => b.professor));
}
