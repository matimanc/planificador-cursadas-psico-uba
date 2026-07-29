"use client";

import { Criteria, Subject } from "@/lib/types";

interface Props {
  criteria: Criteria;
  onChange: (criteria: Criteria) => void;
  subjects: Subject[];
}

export function CriteriaPanel({ criteria, onChange, subjects }: Props) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold">Criterios</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          Días ideales de cursada
          <input
            type="number"
            min={1}
            max={6}
            value={criteria.idealDays}
            onChange={(e) => onChange({ ...criteria, idealDays: Number(e.target.value) })}
            className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-600 dark:bg-neutral-800"
          />
        </label>
        <label className="flex flex-col gap-1">
          Hora mínima
          <input
            type="time"
            value={criteria.minStartTime}
            onChange={(e) => onChange({ ...criteria, minStartTime: e.target.value })}
            className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-600 dark:bg-neutral-800"
          />
        </label>
        <label className="flex flex-col gap-1">
          Hora máxima
          <input
            type="time"
            value={criteria.maxEndTime}
            onChange={(e) => onChange({ ...criteria, maxEndTime: e.target.value })}
            className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-600 dark:bg-neutral-800"
          />
        </label>
        <label className="flex flex-col gap-1">
          Hueco máximo tolerado (min)
          <input
            type="number"
            min={0}
            value={criteria.maxGapMinutes}
            onChange={(e) => onChange({ ...criteria, maxGapMinutes: Number(e.target.value) })}
            className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-600 dark:bg-neutral-800"
          />
        </label>
        <label className="flex items-center gap-2 self-end">
          <input
            type="checkbox"
            checked={criteria.groupPracticosFirst}
            onChange={(e) => onChange({ ...criteria, groupPracticosFirst: e.target.checked })}
          />
          Priorizar agrupar prácticos
        </label>
      </div>

      <div className="mt-3 border-t border-neutral-200 pt-3 text-xs dark:border-neutral-700">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!criteria.fixedSubject}
            onChange={(e) =>
              onChange({
                ...criteria,
                fixedSubject: e.target.checked
                  ? { subjectId: subjects[0]?.id ?? "", day: "lunes" }
                  : null,
              })
            }
          />
          Fijar una materia en un día específico
        </label>
        {criteria.fixedSubject && (
          <div className="mt-2 flex gap-2">
            <select
              value={criteria.fixedSubject.subjectId}
              onChange={(e) =>
                onChange({
                  ...criteria,
                  fixedSubject: { ...criteria.fixedSubject!, subjectId: e.target.value },
                })
              }
              className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-600 dark:bg-neutral-800"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || "Materia sin nombre"}
                </option>
              ))}
            </select>
            <select
              value={criteria.fixedSubject.day}
              onChange={(e) =>
                onChange({
                  ...criteria,
                  fixedSubject: { ...criteria.fixedSubject!, day: e.target.value },
                })
              }
              className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-600 dark:bg-neutral-800"
            >
              {["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
