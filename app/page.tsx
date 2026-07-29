"use client";

import { useMemo, useState } from "react";
import { Subject, Criteria, GenerationResult } from "@/lib/types";
import { generatePlans, DEFAULT_CRITERIA } from "@/lib/engine";
import { newId } from "@/lib/id";
import { SubjectCard } from "@/components/SubjectCard";
import { CriteriaPanel } from "@/components/CriteriaPanel";
import { PlanList } from "@/components/PlanList";

function emptySubject(): Subject {
  const catedraId = newId("catedra");
  return {
    id: newId("subject"),
    name: "",
    hasMultipleCatedras: false,
    teoricoPriorities: {},
    catedras: [{ id: catedraId, label: "Cátedra única", rawText: "", parsed: null }],
  };
}

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([emptySubject()]);
  const [criteria, setCriteria] = useState<Criteria>(DEFAULT_CRITERIA);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const readySubjects = useMemo(
    () => subjects.filter((s) => s.catedras.some((c) => c.parsed)),
    [subjects]
  );

  function updateSubject(id: string, next: Subject) {
    setSubjects((prev) => prev.map((s) => (s.id === id ? next : s)));
  }

  function removeSubject(id: string) {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    if (criteria.fixedSubject?.subjectId === id) {
      setCriteria((c) => ({ ...c, fixedSubject: null }));
    }
  }

  function addSubject() {
    setSubjects((prev) => [...prev, emptySubject()]);
  }

  function handleGenerate() {
    setResult(generatePlans(subjects, criteria));
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Planificador de cursadas</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Pegá los horarios de tus materias tal como los copiás de la facultad y generá planes de
          cursada sin superposiciones.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold">1. Materias</h2>
          {subjects.map((s) => (
            <SubjectCard
              key={s.id}
              subject={s}
              onChange={(next) => updateSubject(s.id, next)}
              onRemove={() => removeSubject(s.id)}
            />
          ))}
          <button
            type="button"
            onClick={addSubject}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
          >
            + Agregar materia
          </button>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">2. Criterios</h2>
          <div className="mt-3">
            <CriteriaPanel criteria={criteria} onChange={setCriteria} subjects={readySubjects} />
          </div>
        </section>

        <section className="mt-8">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={readySubjects.length === 0}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            Generar planes
          </button>
        </section>

        {result && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">3. Resultados</h2>
            <div className="mt-3">
              <PlanList result={result} blockedSlots={criteria.blockedSlots} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
