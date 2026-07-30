"use client";

import { useState } from "react";
import { Criteria, Subject, WEEKDAYS } from "@/lib/types";
import { newId } from "@/lib/id";

interface Props {
  criteria: Criteria;
  onChange: (criteria: Criteria) => void;
  subjects: Subject[];
}

const DAY_LABELS: Record<string, string> = {
  lunes: "Lun",
  martes: "Mar",
  miercoles: "Mié",
  jueves: "Jue",
  viernes: "Vie",
  sabado: "Sáb",
};

export function CriteriaPanel({ criteria, onChange, subjects }: Props) {
  const [newBlock, setNewBlock] = useState({
    label: "",
    day: "lunes",
    start: "19:00",
    end: "20:30",
  });

  const selectedDays = criteria.allowedDays ?? [];

  function toggleDay(day: string) {
    const base = criteria.allowedDays ?? [];
    const next = base.includes(day) ? base.filter((d) => d !== day) : [...base, day];
    onChange({ ...criteria, allowedDays: next.length === 0 ? null : next });
  }

  function addBlockedSlot() {
    if (!newBlock.label.trim()) return;
    onChange({
      ...criteria,
      blockedSlots: [...criteria.blockedSlots, { id: newId("blocked"), ...newBlock }],
    });
    setNewBlock({ label: "", day: "lunes", start: "19:00", end: "20:30" });
  }

  function removeBlockedSlot(id: string) {
    onChange({ ...criteria, blockedSlots: criteria.blockedSlots.filter((b) => b.id !== id) });
  }

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
              {WEEKDAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-neutral-200 pt-3 text-xs dark:border-neutral-700">
        <p className="font-semibold text-neutral-700 dark:text-neutral-200">Días de cursada permitidos</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {WEEKDAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={`rounded border px-2 py-1 ${
                selectedDays.includes(d)
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  : "border-neutral-300 text-neutral-500 dark:border-neutral-600"
              }`}
            >
              {DAY_LABELS[d]}
            </button>
          ))}
        </div>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          Marcá los días en los que querés tener clases. Si no marcás ninguno, no hay restricción
          (se consideran todos). Es una restricción dura: ningún plan va a proponer horarios fuera
          de los días marcados.
        </p>
      </div>

      <div className="mt-3 border-t border-neutral-200 pt-3 text-xs dark:border-neutral-700">
        <p className="font-semibold text-neutral-700 dark:text-neutral-200">
          Horarios bloqueados (actividades personales)
        </p>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          Cargá acá cualquier compromiso fijo (trabajo, gimnasio, etc.) para que el plan se arme
          alrededor de esos horarios.{" "}
          <strong>
            Si estás cursando una materia anual (por ejemplo Psicopatología o Psicoanálisis en
            Psico UBA), agregá también sus horarios acá
          </strong>
          , ya que su cronograma no forma parte de las materias que estás combinando en esta
          herramienta.
        </p>

        {criteria.blockedSlots.length > 0 && (
          <ul className="mt-2 space-y-1">
            {criteria.blockedSlots.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded border border-neutral-200 px-2 py-1 dark:border-neutral-700"
              >
                <span>
                  <strong>{b.label}</strong> · {DAY_LABELS[b.day] ?? b.day} {b.start}-{b.end}
                </span>
                <button
                  type="button"
                  onClick={() => removeBlockedSlot(b.id)}
                  className="px-1 text-neutral-400 hover:text-red-500"
                  aria-label="Eliminar horario bloqueado"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            Actividad
            <input
              value={newBlock.label}
              onChange={(e) => setNewBlock({ ...newBlock, label: e.target.value })}
              placeholder="Ej. Trabajo, Psicopatología"
              className="w-36 rounded border border-neutral-300 px-2 py-1 dark:border-neutral-600 dark:bg-neutral-800"
            />
          </label>
          <label className="flex flex-col gap-1">
            Día
            <select
              value={newBlock.day}
              onChange={(e) => setNewBlock({ ...newBlock, day: e.target.value })}
              className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-600 dark:bg-neutral-800"
            >
              {WEEKDAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Desde
            <input
              type="time"
              value={newBlock.start}
              onChange={(e) => setNewBlock({ ...newBlock, start: e.target.value })}
              className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-600 dark:bg-neutral-800"
            />
          </label>
          <label className="flex flex-col gap-1">
            Hasta
            <input
              type="time"
              value={newBlock.end}
              onChange={(e) => setNewBlock({ ...newBlock, end: e.target.value })}
              className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-600 dark:bg-neutral-800"
            />
          </label>
          <button
            type="button"
            onClick={addBlockedSlot}
            className="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
          >
            + Agregar bloqueo
          </button>
        </div>
      </div>
    </div>
  );
}
