"use client";

import { StatusGlyph, type StatusKind } from "@/components/ui/status-indicator";
import { cn } from "@/lib/cn";

const STAGES = [
  { n: 1, label: "Details & Upload" },
  { n: 2, label: "AI Content" },
  { n: 3, label: "Processing" },
  { n: 4, label: "Review & Publish" },
] as const;

/** Left-to-right 4-stage stepper (Screen 8). Pills for stages 1-2 are clickable while the
 * wizard hasn't started processing yet; once stage 3 starts, the whole stepper locks
 * forward-only per the spec's Navigation Rules — clicking never jumps backward past that point. */
export function WizardStepper({
  stage,
  locked,
  onNavigate,
}: {
  stage: 1 | 2 | 3 | 4;
  locked: boolean;
  onNavigate: (stage: 1 | 2) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {STAGES.map((s, i) => {
        const kind: StatusKind = s.n < stage ? "done" : s.n === stage ? "in-progress" : "not-started";
        const clickable = !locked && s.n < stage && (s.n === 1 || s.n === 2);
        return (
          <div key={s.n} className="flex shrink-0 items-center gap-2">
            {i > 0 ? <span className="h-px w-6 bg-hairline" aria-hidden /> : null}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onNavigate(s.n as 1 | 2)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium font-body transition-colors",
                s.n === stage ? "border-accent-text/50 bg-accent-text/8 text-ink" : "border-hairline bg-canvas text-muted",
                clickable && "hover:border-body cursor-pointer"
              )}
            >
              <StatusGlyph kind={kind} label={`Stage ${s.n}: ${s.label}`} />
              <span>
                {s.n} {s.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
