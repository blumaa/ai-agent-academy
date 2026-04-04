"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Rubric {
  id: string;
  title: string;
  description: string | null;
  evalCategory: string;
  deltaThreshold: number;
}

interface Criterion {
  id: string;
  name: string;
  stableKey: string;
  description: string | null;
  sortOrder: number;
  weight: number;
  graderType: string;
}

interface Level {
  id: string;
  label: string;
  sortOrder: number;
  numericValue: number | null;
  isPassing: boolean;
}

interface Cell {
  id: string;
  criterionId: string;
  levelId: string;
  description: string | null;
}

interface Props {
  rubric: Rubric;
  criteria: Criterion[];
  levels: Level[];
  cells: Cell[];
}

export function RubricEditor({
  rubric: initialRubric,
  criteria: initialCriteria,
  levels: initialLevels,
  cells: initialCells,
}: Props) {
  const router = useRouter();
  const [rubric, setRubric] = useState(initialRubric);
  const [criteria, setCriteria] = useState(initialCriteria);
  const [levels] = useState(initialLevels);
  const [cellMap, setCellMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const cell of initialCells) {
      map[`${cell.criterionId}:${cell.levelId}`] = cell.description ?? "";
    }
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function getCellKey(criterionId: string, levelId: string) {
    return `${criterionId}:${levelId}`;
  }

  function addCriterion() {
    const sortOrder = criteria.length;
    const stableKey = `criterion_${Date.now()}`;
    setCriteria((prev) => [
      ...prev,
      {
        id: `temp_${Date.now()}`,
        name: "",
        stableKey,
        description: null,
        sortOrder,
        weight: 1.0,
        graderType: "model",
      },
    ]);
  }

  function removeCriterion(index: number) {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCriterion(index: number, updates: Partial<Criterion>) {
    setCriteria((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const updated = { ...c, ...updates };
        // Auto-generate stableKey from name
        if (updates.name !== undefined) {
          updated.stableKey = updates.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, "");
        }
        return updated;
      }),
    );
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);

    // 1. Save rubric metadata
    await fetch(`/api/rubrics/${rubric.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rubric),
    });

    // 2. Save criteria
    const criteriaRes = await fetch(`/api/rubrics/${rubric.id}/criteria`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        criteria: criteria.map((c, i) => ({
          name: c.name,
          stableKey: c.stableKey,
          description: c.description,
          sortOrder: i,
          weight: c.weight,
          graderType: c.graderType,
        })),
      }),
    });

    // Get back the real IDs
    const savedCriteria: Criterion[] = await criteriaRes.json();

    // 3. Save cells — map temp IDs to real IDs
    const cellsToSave: Array<{
      criterionId: string;
      levelId: string;
      description: string;
    }> = [];

    for (let i = 0; i < savedCriteria.length; i++) {
      const oldCriterion = criteria[i];
      const newCriterion = savedCriteria[i];
      for (const level of levels) {
        const key = getCellKey(oldCriterion.id, level.id);
        const description = cellMap[key] ?? "";
        if (description) {
          cellsToSave.push({
            criterionId: newCriterion.id,
            levelId: level.id,
            description,
          });
        }
      }
    }

    await fetch(`/api/rubrics/${rubric.id}/cells`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cells: cellsToSave }),
    });

    setSaving(false);
    setStatus("Saved");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this rubric? This cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/rubrics/${rubric.id}`, { method: "DELETE" });
    router.push("/rubrics");
  }

  return (
    <div className="space-y-6">
      {/* Rubric metadata */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={rubric.title}
              onChange={(e) =>
                setRubric((r) => ({ ...r, title: e.target.value }))
              }
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={rubric.evalCategory}
              onChange={(e) =>
                setRubric((r) => ({ ...r, evalCategory: e.target.value }))
              }
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm"
            >
              <option value="capability">Capability</option>
              <option value="regression">Regression</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={rubric.description ?? ""}
            onChange={(e) =>
              setRubric((r) => ({ ...r, description: e.target.value }))
            }
            rows={2}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div className="w-48">
          <label className="block text-sm font-medium mb-1">
            Delta Threshold
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={rubric.deltaThreshold}
            onChange={(e) =>
              setRubric((r) => ({
                ...r,
                deltaThreshold: parseFloat(e.target.value) || 1.0,
              }))
            }
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Criteria list */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Criteria</h2>
          <button
            onClick={addCriterion}
            className="text-sm text-[#58A6FF] hover:underline"
          >
            + Add Criterion
          </button>
        </div>

        {criteria.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No criteria yet. Add one to start building your rubric.
          </p>
        ) : (
          <div className="space-y-3">
            {criteria.map((criterion, index) => (
              <div
                key={criterion.id}
                className="bg-[var(--background)] border border-[var(--border)] rounded-md p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Criterion name..."
                      value={criterion.name}
                      onChange={(e) =>
                        updateCriterion(index, { name: e.target.value })
                      }
                      className="bg-[var(--surface)] border border-[var(--border)] rounded px-2 py-1.5 text-sm"
                    />
                    <select
                      value={criterion.graderType}
                      onChange={(e) =>
                        updateCriterion(index, { graderType: e.target.value })
                      }
                      className="bg-[var(--surface)] border border-[var(--border)] rounded px-2 py-1.5 text-sm"
                    >
                      <option value="model">Model (Claude)</option>
                      <option value="automated">Automated (Shell)</option>
                      <option value="human">Human (Manual)</option>
                    </select>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="Weight"
                      value={criterion.weight}
                      onChange={(e) =>
                        updateCriterion(index, {
                          weight: parseFloat(e.target.value) || 1.0,
                        })
                      }
                      className="bg-[var(--surface)] border border-[var(--border)] rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => removeCriterion(index)}
                    className="text-[var(--accent-red)] text-sm hover:underline shrink-0"
                  >
                    Remove
                  </button>
                </div>

                {/* Cell descriptions for this criterion */}
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {levels.map((level) => {
                    const key = getCellKey(criterion.id, level.id);
                    return (
                      <div key={level.id}>
                        <label className="block text-[10px] text-[var(--muted)] mb-0.5">
                          Level {level.label}
                        </label>
                        <textarea
                          rows={2}
                          placeholder={`Level ${level.label} description...`}
                          value={cellMap[key] ?? ""}
                          onChange={(e) =>
                            setCellMap((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded px-2 py-1 text-xs resize-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[var(--accent-green-dark)] hover:bg-[var(--accent-green)] text-white font-medium py-2 px-6 rounded-md transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Rubric"}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-[var(--accent-red)]/20 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/30 font-medium py-2 px-6 rounded-md transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete Rubric"}
        </button>
        {status && (
          <span className="text-sm text-[var(--accent-green)]">{status}</span>
        )}
      </div>
    </div>
  );
}
