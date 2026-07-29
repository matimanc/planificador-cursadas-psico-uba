"use client";

import { parseCatedraText } from "@/lib/parser";
import { newId } from "@/lib/id";
import { Subject, ScheduleBlock } from "@/lib/types";
import { EditableRowsTable } from "./EditableRowsTable";

interface Props {
  subject: Subject;
  onChange: (subject: Subject) => void;
  onRemove: () => void;
}

export function SubjectCard({ subject, onChange, onRemove }: Props) {
  function updateName(name: string) {
    onChange({ ...subject, name });
  }

  function toggleMultipleCatedras(checked: boolean) {
    if (checked && subject.catedras.length === 1) {
      onChange({
        ...subject,
        hasMultipleCatedras: true,
        catedras: [
          { ...subject.catedras[0], label: subject.catedras[0].label || "Cátedra 1" },
          { id: newId("catedra"), label: "Cátedra 2", rawText: "", parsed: null },
        ],
      });
    } else if (!checked) {
      onChange({
        ...subject,
        hasMultipleCatedras: false,
        catedras: [subject.catedras[0]],
      });
    } else {
      onChange({ ...subject, hasMultipleCatedras: checked });
    }
  }

  function addCatedra() {
    onChange({
      ...subject,
      catedras: [
        ...subject.catedras,
        { id: newId("catedra"), label: `Cátedra ${subject.catedras.length + 1}`, rawText: "", parsed: null },
      ],
    });
  }

  function updateCatedraText(catedraId: string, rawText: string) {
    const catedra = subject.catedras.find((c) => c.id === catedraId)!;
    const parsed = parseCatedraText(rawText, {
      subjectId: subject.id,
      subjectName: subject.name || "Materia sin nombre",
      catedraId: catedra.id,
      catedraLabel: catedra.label,
    });
    onChange({
      ...subject,
      catedras: subject.catedras.map((c) => (c.id === catedraId ? { ...c, rawText, parsed } : c)),
    });
  }

  function updateCatedraLabel(catedraId: string, label: string) {
    onChange({
      ...subject,
      catedras: subject.catedras.map((c) => (c.id === catedraId ? { ...c, label } : c)),
    });
  }

  function removeCatedra(catedraId: string) {
    onChange({ ...subject, catedras: subject.catedras.filter((c) => c.id !== catedraId) });
  }

  function updateBlocks(
    catedraId: string,
    kind: "teoricos" | "comisiones",
    rows: ScheduleBlock[]
  ) {
    onChange({
      ...subject,
      catedras: subject.catedras.map((c) =>
        c.id === catedraId && c.parsed ? { ...c, parsed: { ...c.parsed, [kind]: rows } } : c
      ),
    });
  }

  function removeBlock(catedraId: string, kind: "teoricos" | "comisiones", id: string) {
    const catedra = subject.catedras.find((c) => c.id === catedraId);
    if (!catedra?.parsed) return;
    updateBlocks(
      catedraId,
      kind,
      catedra.parsed[kind].filter((r) => r.id !== id)
    );
  }

  const allTeoricos = subject.catedras.flatMap((c) => c.parsed?.teoricos ?? []);

  const subjectTeoricoPriority: "fundamental" | "low" =
    allTeoricos.length > 0 && allTeoricos.every((t) => subject.teoricoPriorities[t.identifier] === "low")
      ? "low"
      : "fundamental";

  function setSubjectTeoricoPriority(priority: "fundamental" | "low") {
    onChange({
      ...subject,
      teoricoPriorities: Object.fromEntries(allTeoricos.map((t) => [t.identifier, priority])),
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-2">
        <input
          value={subject.name}
          onChange={(e) => updateName(e.target.value)}
          placeholder="Nombre de la materia"
          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm font-semibold focus:border-blue-400 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800"
        />
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded px-2 py-1 text-xs text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        >
          Eliminar materia
        </button>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
        <input
          type="checkbox"
          checked={subject.hasMultipleCatedras}
          onChange={(e) => toggleMultipleCatedras(e.target.checked)}
        />
        ¿Más de una cátedra dictándola en paralelo?
      </label>

      <div className="mt-3 space-y-4">
        {subject.catedras.map((catedra) => (
          <div key={catedra.id} className="rounded border border-neutral-200 p-3 dark:border-neutral-700">
            {subject.hasMultipleCatedras && (
              <div className="mb-2 flex items-center gap-2">
                <input
                  value={catedra.label}
                  onChange={(e) => updateCatedraLabel(catedra.id, e.target.value)}
                  placeholder="Nombre de la cátedra"
                  className="rounded border border-neutral-300 px-2 py-0.5 text-xs dark:border-neutral-600 dark:bg-neutral-800"
                />
                {subject.catedras.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeCatedra(catedra.id)}
                    className="text-xs text-neutral-400 hover:text-red-500"
                  >
                    Quitar cátedra
                  </button>
                )}
              </div>
            )}
            <textarea
              value={catedra.rawText}
              onChange={(e) => updateCatedraText(catedra.id, e.target.value)}
              rows={6}
              placeholder="Pegá acá el texto de horarios de esta cátedra (Teóricos y Comisiones)."
              className="w-full rounded border border-neutral-300 p-2 font-mono text-xs focus:border-blue-400 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800"
            />
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              ⚠️ Pegá acá todos los horarios de la materia, tal como los copiás de la fuente
              original: todos los teóricos y todas las comisiones de práctico. Si pegás solo una
              parte, el sistema no va a poder evaluar todas las combinaciones posibles.
            </p>

            {catedra.parsed && catedra.parsed.errors.length > 0 && (
              <div className="mt-2 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                <p className="font-semibold">
                  {catedra.parsed.errors.length} fila(s) no se pudieron interpretar:
                </p>
                <ul className="mt-1 list-disc pl-4">
                  {catedra.parsed.errors.map((e, i) => (
                    <li key={i}>
                      <code>{e.raw.trim()}</code> — {e.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {catedra.parsed && (
              <>
                <EditableRowsTable
                  title="Teóricos"
                  rows={catedra.parsed.teoricos}
                  onChange={(rows) => updateBlocks(catedra.id, "teoricos", rows)}
                  onRemove={(id) => removeBlock(catedra.id, "teoricos", id)}
                />
                <EditableRowsTable
                  title="Comisiones"
                  rows={catedra.parsed.comisiones}
                  onChange={(rows) => updateBlocks(catedra.id, "comisiones", rows)}
                  onRemove={(id) => removeBlock(catedra.id, "comisiones", id)}
                />
              </>
            )}
          </div>
        ))}
        {subject.hasMultipleCatedras && (
          <button
            type="button"
            onClick={addCatedra}
            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            + Agregar otra cátedra
          </button>
        )}
      </div>

      {allTeoricos.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            Prioridad de los teóricos de esta materia
          </p>
          <div className="mt-1 inline-flex overflow-hidden rounded border border-neutral-300 text-xs dark:border-neutral-600">
            <button
              type="button"
              onClick={() => setSubjectTeoricoPriority("fundamental")}
              className={`px-3 py-1.5 ${
                subjectTeoricoPriority === "fundamental"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              Teórico fundamental
            </button>
            <button
              type="button"
              onClick={() => setSubjectTeoricoPriority("low")}
              className={`border-l border-neutral-300 px-3 py-1.5 dark:border-neutral-600 ${
                subjectTeoricoPriority === "low"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              Prioridad baja (a evaluar)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
