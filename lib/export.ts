import { DAY_ORDER, Plan } from "./types";

const HEADERS = ["Día", "Horario", "Materia", "Tipo", "Comisión", "Docente", "Estado"];

export function planToTsv(plan: Plan): string {
  const rows = [...plan.blocks].sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.start.localeCompare(b.start);
  });

  const lines = [HEADERS.join("\t")];
  for (const b of rows) {
    lines.push(
      [
        capitalize(b.day),
        `${b.start}-${b.end}`,
        b.subjectName,
        b.kind === "teorico" ? "Teórico" : "Práctico",
        b.identifier,
        b.professor,
        b.priority === "low" ? "A evaluar" : "Confirmado",
      ].join("\t")
    );
  }
  return lines.join("\n");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
