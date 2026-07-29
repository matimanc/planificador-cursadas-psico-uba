"use client";

import { useState } from "react";
import { Plan, DAY_ORDER } from "@/lib/types";
import { planToTsv } from "@/lib/export";

export function PlanFlatTable({ plan }: { plan: Plan }) {
  const [copied, setCopied] = useState(false);

  const rows = [...plan.blocks].sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.start.localeCompare(b.start);
  });

  async function copy() {
    await navigator.clipboard.writeText(planToTsv(plan));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={copy}
          className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
        >
          {copied ? "¡Copiado!" : "Copiar tabla (TSV)"}
        </button>
      </div>
      <div className="overflow-x-auto rounded border border-neutral-200 dark:border-neutral-700">
        <table className="w-full text-xs">
          <thead className="bg-neutral-100 dark:bg-neutral-800">
            <tr>
              {["Día", "Horario", "Materia", "Tipo", "Comisión", "Docente", "Estado"].map((h) => (
                <th key={h} className="px-2 py-1 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-neutral-200 dark:border-neutral-700">
                <td className="px-2 py-1 capitalize">{b.day}</td>
                <td className="px-2 py-1">
                  {b.start}-{b.end}
                </td>
                <td className="px-2 py-1">{b.subjectName}</td>
                <td className="px-2 py-1">{b.kind === "teorico" ? "Teórico" : "Práctico"}</td>
                <td className="px-2 py-1">{b.identifier}</td>
                <td className="px-2 py-1">{b.professor}</td>
                <td className="px-2 py-1">
                  {b.priority === "low" ? (
                    <span className="text-amber-600 dark:text-amber-400">A evaluar</span>
                  ) : (
                    "Confirmado"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
