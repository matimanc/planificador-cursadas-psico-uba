"use client";

import { useState } from "react";
import { BlockedSlot, GenerationResult } from "@/lib/types";
import { PlanView } from "./PlanView";
import { PlanFlatTable } from "./PlanFlatTable";

export function PlanList({
  result,
  blockedSlots = [],
}: {
  result: GenerationResult;
  blockedSlots?: BlockedSlot[];
}) {
  const [activeId, setActiveId] = useState(result.plans[0]?.id);
  const activePlan = result.plans.find((p) => p.id === activeId) ?? result.plans[0];

  return (
    <div className="space-y-4">
      {result.blockedSubjects.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-semibold">Materias excluidas de la generación:</p>
          <ul className="mt-1 list-disc pl-4">
            {result.blockedSubjects.map((b) => (
              <li key={b.subjectId}>
                <strong>{b.subjectName}</strong>: {b.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.relaxationNotes.length > 0 && (
        <div className="rounded border border-blue-300 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200">
          {result.relaxationNotes.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
        </div>
      )}

      {result.plans.length === 0 ? (
        <p className="text-sm text-neutral-500">No se generaron planes todavía.</p>
      ) : (
        <>
          <div className="flex gap-2">
            {result.plans.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveId(p.id)}
                className={`rounded px-3 py-1 text-xs font-medium ${
                  p.id === activePlan?.id
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "border border-neutral-300 dark:border-neutral-600"
                }`}
              >
                Plan {i + 1} · {p.daysUsed.length}d
              </button>
            ))}
          </div>

          {activePlan && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-600 dark:text-neutral-300">
                {activePlan.rankingExplanation}
              </p>
              {activePlan.warnings.length > 0 && (
                <div className="rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                  {activePlan.warnings.map((w, i) => (
                    <p key={i}>⚠ {w}</p>
                  ))}
                </div>
              )}
              <PlanView plan={activePlan} blockedSlots={blockedSlots} planElementId="active-plan-view" />
              <PlanFlatTable plan={activePlan} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
