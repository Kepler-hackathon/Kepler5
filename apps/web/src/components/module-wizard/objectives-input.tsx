"use client";

import { Plus, X } from "@phosphor-icons/react";
import { TextInput } from "@/components/ui/input";
import { IconButton } from "@/components/ui/button";

/** Repeatable "Learning Objectives" list (Screen 8, Stage 1) — bound directly to
 * modules.objectives (jsonb string[]). */
export function ObjectivesInput({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  function updateAt(i: number, text: string) {
    onChange(value.map((v, idx) => (idx === i ? text : v)));
  }
  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...value, ""]);
  }

  return (
    <div className="space-y-2">
      {value.map((objective, i) => (
        <div key={i} className="flex items-center gap-2">
          <TextInput
            value={objective}
            onChange={(e) => updateAt(i, e.target.value)}
            placeholder="e.g. Implement recursive tree traversal"
          />
          <IconButton label="Remove objective" size="sm" onClick={() => removeAt(i)}>
            <X />
          </IconButton>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium font-body text-accent-text hover:underline underline-offset-2"
      >
        <Plus className="size-4" /> Add objective
      </button>
    </div>
  );
}
