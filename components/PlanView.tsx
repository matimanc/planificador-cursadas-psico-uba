"use client";

import { Plan } from "@/lib/types";

const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const DAY_LABELS: Record<string, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
};

const GRID_START_MIN = 7 * 60;
const GRID_END_MIN = 23 * 60;
const GRID_HEIGHT_PX = 720;

const COLORS = [
  "bg-blue-100 border-blue-400 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  "bg-emerald-100 border-emerald-400 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  "bg-purple-100 border-purple-400 text-purple-900 dark:bg-purple-950 dark:text-purple-200",
  "bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  "bg-rose-100 border-rose-400 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  "bg-cyan-100 border-cyan-400 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200",
  "bg-lime-100 border-lime-400 text-lime-900 dark:bg-lime-950 dark:text-lime-200",
];

function colorFor(subjectId: string, subjectIds: string[]): string {
  const idx = subjectIds.indexOf(subjectId) % COLORS.length;
  return COLORS[idx];
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function PlanView({ plan, planElementId }: { plan: Plan; planElementId?: string }) {
  const subjectIds = [...new Set(plan.blocks.map((b) => b.subjectId))];
  const activeDays = DAYS.filter((d) => plan.blocks.some((b) => b.day === d));
  const daysToShow = activeDays.length > 0 ? activeDays : DAYS;

  return (
    <div id={planElementId} className="overflow-x-auto">
      <div
        className="grid min-w-[640px]"
        style={{ gridTemplateColumns: `56px repeat(${daysToShow.length}, 1fr)` }}
      >
        <div />
        {daysToShow.map((d) => (
          <div key={d} className="px-2 pb-1 text-center text-xs font-semibold">
            {DAY_LABELS[d]}
          </div>
        ))}

        <div
          className="relative text-right text-[10px] text-neutral-400"
          style={{ height: GRID_HEIGHT_PX }}
        >
          {Array.from({ length: (GRID_END_MIN - GRID_START_MIN) / 60 + 1 }, (_, i) => {
            const hour = 7 + i;
            const top = ((hour * 60 - GRID_START_MIN) / (GRID_END_MIN - GRID_START_MIN)) * GRID_HEIGHT_PX;
            return (
              <div key={hour} className="absolute right-1 -translate-y-1/2" style={{ top }}>
                {hour}:00
              </div>
            );
          })}
        </div>

        {daysToShow.map((day) => (
          <div
            key={day}
            className="relative border-l border-neutral-200 dark:border-neutral-700"
            style={{ height: GRID_HEIGHT_PX }}
          >
            {Array.from({ length: (GRID_END_MIN - GRID_START_MIN) / 60 + 1 }, (_, i) => {
              const top = (i * 60 / (GRID_END_MIN - GRID_START_MIN)) * GRID_HEIGHT_PX;
              return (
                <div
                  key={i}
                  className="absolute w-full border-t border-neutral-100 dark:border-neutral-800"
                  style={{ top }}
                />
              );
            })}
            {plan.blocks
              .filter((b) => b.day === day)
              .map((b) => {
                const top =
                  ((toMinutes(b.start) - GRID_START_MIN) / (GRID_END_MIN - GRID_START_MIN)) *
                  GRID_HEIGHT_PX;
                const height =
                  ((toMinutes(b.end) - toMinutes(b.start)) / (GRID_END_MIN - GRID_START_MIN)) *
                  GRID_HEIGHT_PX;
                const isLow = b.priority === "low";
                return (
                  <div
                    key={b.id}
                    className={`absolute left-0.5 right-0.5 overflow-hidden rounded border px-1 py-0.5 text-[10px] leading-tight ${colorFor(
                      b.subjectId,
                      subjectIds
                    )} ${isLow ? "border-dashed opacity-80" : ""}`}
                    style={{ top, height: Math.max(height, 22) }}
                  >
                    <p className="truncate font-semibold">
                      {b.subjectName} {isLow && "· a evaluar"}
                    </p>
                    <p className="truncate">
                      {b.kind === "teorico" ? "Teórico" : "Práctico"} {b.identifier} · {b.professor}
                    </p>
                    <p className="truncate">
                      {b.start}-{b.end}
                    </p>
                    {b.isOverlapWarning && (
                      <p className="truncate font-semibold text-red-600 dark:text-red-400">
                        ⚠ se superpone
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
