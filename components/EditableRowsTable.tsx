"use client";

import { ScheduleBlock } from "@/lib/types";

interface Props {
  title: string;
  rows: ScheduleBlock[];
  onChange: (rows: ScheduleBlock[]) => void;
  onRemove: (id: string) => void;
}

const FIELDS: { key: keyof ScheduleBlock; label: string; width?: string }[] = [
  { key: "identifier", label: "ID", width: "w-14" },
  { key: "day", label: "Día", width: "w-24" },
  { key: "start", label: "Inicio", width: "w-20" },
  { key: "end", label: "Fin", width: "w-20" },
  { key: "professor", label: "Docente" },
  { key: "vacancies", label: "Vac.", width: "w-14" },
  { key: "oblig", label: "Oblig.", width: "w-16" },
  { key: "room", label: "Aula", width: "w-20" },
];

export function EditableRowsTable({ title, rows, onChange, onRemove }: Props) {
  if (rows.length === 0) return null;

  function updateCell(id: string, key: keyof ScheduleBlock, value: string) {
    onChange(rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }

  return (
    <div className="mt-2">
      <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{title}</p>
      <div className="overflow-x-auto rounded border border-neutral-200 dark:border-neutral-700">
        <table className="w-full text-xs">
          <thead className="bg-neutral-100 dark:bg-neutral-800">
            <tr>
              {FIELDS.map((f) => (
                <th key={f.key} className={`px-2 py-1 text-left font-medium ${f.width ?? ""}`}>
                  {f.label}
                </th>
              ))}
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-neutral-200 dark:border-neutral-700">
                {FIELDS.map((f) => (
                  <td key={f.key} className="p-0.5">
                    <input
                      value={row[f.key] as string}
                      onChange={(e) => updateCell(row.id, f.key, e.target.value)}
                      className="w-full min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-neutral-300 focus:border-blue-400 focus:outline-none dark:hover:border-neutral-600"
                    />
                  </td>
                ))}
                <td className="p-0.5 text-right">
                  <button
                    type="button"
                    onClick={() => onRemove(row.id)}
                    className="px-1 text-neutral-400 hover:text-red-500"
                    aria-label="Eliminar fila"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
