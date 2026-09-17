"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ItemsPerLectureStepper } from "./items-per-lecture-stepper";

/** Screen 8, Stage 2 — single centered decision card, matches the spec copy verbatim. */
export function Stage2AiOptIn({
  aiOptIn,
  itemsPerLecture,
  onChange,
  onBack,
  onNext,
  saving,
}: {
  aiOptIn: boolean;
  itemsPerLecture: number;
  onChange: (partial: { aiOptIn?: boolean; itemsPerLecture?: number }) => void;
  onBack: () => void;
  onNext: () => void;
  saving: boolean;
}) {
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-[var(--radius-card)] border border-hairline bg-surface-card p-6 text-center">
      <div>
        <h2 className="text-[22px]">Generate AI practice content for this module?</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted font-body">
          We&rsquo;ll create a small set of mini-quizzes and interactive widgets grounded directly in each lecture&rsquo;s
          content — up to {itemsPerLecture} per lecture by default. You&rsquo;ll review and approve each one before
          students see them.
        </p>
      </div>

      <label className="flex items-center justify-center gap-3">
        <Switch checked={aiOptIn} onCheckedChange={(v) => onChange({ aiOptIn: v })} disabled={saving} />
        <span className="text-[14px] font-medium font-body text-ink">Generate mini-quizzes &amp; interactive widgets</span>
      </label>

      {aiOptIn ? (
        <div className="flex items-center justify-center gap-3">
          <span className="text-[13px] font-body text-muted">Items per lecture</span>
          <ItemsPerLectureStepper value={itemsPerLecture} onChange={(v) => onChange({ itemsPerLecture: v })} />
        </div>
      ) : (
        <p className="text-[13px] text-muted font-body">You can always add practice content manually later.</p>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} disabled={saving}>
          Back
        </Button>
        <Button variant="primary" onClick={onNext} disabled={saving}>
          {saving ? "Saving…" : "Next: Process Module"}
        </Button>
      </div>
    </div>
  );
}
