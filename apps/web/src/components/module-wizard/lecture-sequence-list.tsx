"use client";

import { CaretDown, CaretUp, X, Warning } from "@phosphor-icons/react";
import { TextInput } from "@/components/ui/input";
import { IconButton } from "@/components/ui/button";
import { StatusGlyph, type StatusKind } from "@/components/ui/status-indicator";
import type { WizardLecture } from "./types";

function statusFor(l: WizardLecture): { kind: StatusKind; label: string } {
  if (l.uploadPhase === "error") return { kind: "attention", label: `Upload failed: ${l.uploadError ?? "unknown error"}` };
  if (l.uploadPhase === "uploading") return { kind: "in-progress", label: "Uploading…" };
  if (l.parseStatus === "parsed") return { kind: "done", label: "Parsed" };
  if (l.parseStatus === "failed" || l.parseStatus === "unreadable") return { kind: "attention", label: "Parse failed" };
  if (l.parseStatus && l.parseStatus !== "pending") return { kind: "in-progress", label: "Parsing…" };
  return { kind: "not-started", label: "Ready" };
}

/** No drag-and-drop library exists anywhere in this repo, and PUT /api/modules/[id]/lectures
 * only cares about array order (orderIndex = index+1) — not any drag metadata — so simple
 * up/down reordering produces an identical result with far less risk than adding a new dep. */
export function LectureSequenceList({
  lectures,
  onChange,
}: {
  lectures: WizardLecture[];
  onChange: (next: WizardLecture[]) => void;
}) {
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= lectures.length) return;
    const next = [...lectures];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function updateTitle(i: number, title: string) {
    onChange(lectures.map((l, idx) => (idx === i ? { ...l, title } : l)));
  }
  function removeAt(i: number) {
    onChange(lectures.filter((_, idx) => idx !== i));
  }

  if (lectures.length === 0) {
    return <p className="text-[13px] text-muted font-body">No lecture decks attached yet.</p>;
  }

  return (
    <div className="space-y-2">
      {lectures.map((l, i) => {
        const status = statusFor(l);
        return (
          <div key={l.key} className="flex items-center gap-2 rounded-[var(--radius-control)] border border-hairline bg-surface-card p-3">
            <span className="w-5 shrink-0 text-center text-[13px] text-muted font-body">{i + 1}</span>
            <div className="flex shrink-0 flex-col">
              <IconButton label="Move up" size="sm" disabled={i === 0} onClick={() => move(i, -1)}>
                <CaretUp />
              </IconButton>
              <IconButton label="Move down" size="sm" disabled={i === lectures.length - 1} onClick={() => move(i, 1)}>
                <CaretDown />
              </IconButton>
            </div>
            <TextInput
              value={l.title}
              onChange={(e) => updateTitle(i, e.target.value)}
              placeholder="Lecture title"
              className="flex-1"
            />
            <StatusGlyph kind={status.kind} label={status.label} />
            {l.uploadPhase === "error" ? <Warning className="size-4 text-error" aria-hidden /> : null}
            <IconButton label="Remove lecture" size="sm" onClick={() => removeAt(i)}>
              <X />
            </IconButton>
          </div>
        );
      })}
    </div>
  );
}
