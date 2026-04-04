"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateRubricButton() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    const res = await fetch("/api/rubrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New Rubric",
        evalCategory: "capability",
        deltaThreshold: 1.0,
      }),
    });

    if (res.ok) {
      const rubric = await res.json();
      router.push(`/rubrics/${rubric.id}`);
    }
    setCreating(false);
  }

  return (
    <button
      onClick={handleCreate}
      disabled={creating}
      className="bg-[var(--accent-green-dark)] hover:bg-[var(--accent-green)] text-white text-sm font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
    >
      {creating ? "Creating..." : "New Rubric"}
    </button>
  );
}
