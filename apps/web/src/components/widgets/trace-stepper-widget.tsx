"use client";

import * as React from "react";
import { CaretLeft, CaretRight, ArrowCounterClockwise, ThumbsDown, ThumbsUp } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/button";
import { SparkGlyph } from "@/components/ui/status-icons";
import { CitationChip } from "@/components/ui/badges";
import { TREE_HEIGHT_CODE, TREE_HEIGHT_TRACE, type TraceStep } from "@/lib/data/trace-stepper";

/**
 * The real interactive widget behind the "AI generated" chrome. No backend generation
 * step produces this widget's `content` shape today (workers/generator/handler.ts only
 * generates quiz questions) — `code`/`trace` let a caller pass real generated content
 * once that exists; absent that, this falls back to the original fixed demo trace.
 */
export function TraceStepperWidget({
  code = TREE_HEIGHT_CODE,
  trace = TREE_HEIGHT_TRACE,
  onHelpful,
  publishTrigger,
  published,
}: {
  code?: string[];
  trace?: TraceStep[];
  onHelpful?: (helpful: boolean) => void;
  /** Rendered in place of the default Publish button — typically a PublishDialog trigger. */
  publishTrigger?: React.ReactNode;
  published?: boolean;
}) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const [feedback, setFeedback] = React.useState<"up" | "down" | null>(null);
  const step = trace[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === trace.length - 1;

  function choose(f: "up" | "down") {
    setFeedback(f);
    onHelpful?.(f === "up");
  }

  return (
    <div className="rounded-[var(--radius-card)] bg-surface-dark p-6 text-on-dark">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium font-body uppercase tracking-[1px] text-on-dark-soft">
          Stepper · Recursion Stack
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-button-primary px-3 py-1 text-[11px] font-semibold font-body uppercase tracking-[1.5px] text-on-primary">
          <SparkGlyph />
          AI generated
        </div>
      </div>

      <p className="mt-3 max-w-prose text-[14px] leading-relaxed text-on-dark-soft font-body">
        This traces treeHeight one call at a time so you can see exactly when the base case
        fires — and what it returns — before any dereference of a null pointer can happen.
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <CitationChip className="border-white/15 bg-transparent text-on-dark-soft">
          Grounded in Slide 14
        </CitationChip>
        <CitationChip className="border-white/15 bg-transparent text-on-dark-soft">
          Textbook 3.2
        </CitationChip>
      </div>

      {/* Code panel */}
      <div className="mt-5 overflow-x-auto rounded-[var(--radius-control)] bg-surface-dark-soft p-4 font-code text-[13px] leading-6">
        {code.map((line, i) => {
          const active = i + 1 === step.highlightLine;
          return (
            <div
              key={i}
              className={cn(
                "flex gap-4 rounded px-2 transition-colors duration-[var(--duration-step)]",
                active && "bg-amber-fill/20"
              )}
            >
              <span className="w-4 shrink-0 select-none text-right text-muted-soft-on-dark">{i + 1}</span>
              <span className={cn("whitespace-pre", active ? "text-amber-fill" : "text-on-dark")}>{line}</span>
            </div>
          );
        })}
      </div>

      {/* Call stack */}
      <div className="mt-5">
        <p className="mb-2 text-[11px] font-medium font-body uppercase tracking-[1px] text-on-dark-soft">
          Call stack
        </p>
        <div className="flex flex-col-reverse gap-1.5" aria-live="polite">
          {step.callStack.map((frame, i) => (
            <div
              key={frame + i}
              className={cn(
                "rounded-[var(--radius-control)] border px-3 py-2 font-code text-[13px] transition-colors duration-[var(--duration-step)]",
                i === step.callStack.length - 1
                  ? "border-button-primary/60 bg-button-primary/10 text-on-dark"
                  : "border-white/10 bg-transparent text-on-dark-soft"
              )}
            >
              {frame}
            </div>
          ))}
        </div>
      </div>

      {/* Variable inspector */}
      <div className="mt-5">
        <p className="mb-2 text-[11px] font-medium font-body uppercase tracking-[1px] text-on-dark-soft">
          Variables
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 font-code text-[13px]">
          {Object.entries(step.variables).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <dt className="text-on-dark-soft">{k}</dt>
              <dd className="text-on-dark">= {v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p aria-live="polite" className="mt-4 text-[14px] text-on-dark font-body">
        {step.narration}
      </p>

      {/* Step controls */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="flex items-center gap-2">
          <IconButton
            label="Step back"
            disabled={isFirst}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="text-on-dark-soft hover:bg-white/10 hover:text-on-dark disabled:opacity-30"
          >
            <CaretLeft />
          </IconButton>
          <span className="min-w-[5.5rem] text-center text-[13px] text-on-dark-soft font-body">
            Step {stepIndex + 1} of {trace.length}
          </span>
          <IconButton
            label="Step forward"
            disabled={isLast}
            onClick={() => setStepIndex((i) => Math.min(trace.length - 1, i + 1))}
            className="text-on-dark-soft hover:bg-white/10 hover:text-on-dark disabled:opacity-30"
          >
            <CaretRight />
          </IconButton>
          <IconButton
            label="Reset"
            onClick={() => setStepIndex(0)}
            className="text-on-dark-soft hover:bg-white/10 hover:text-on-dark"
          >
            <ArrowCounterClockwise />
          </IconButton>
        </div>
      </div>

      {/* Action bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-on-dark-soft font-body">Helpful?</span>
          <button
            type="button"
            aria-pressed={feedback === "up"}
            onClick={() => choose("up")}
            className={cn(
              "rounded-full p-1.5 transition-colors",
              feedback === "up" ? "bg-success/20 text-success" : "text-on-dark-soft hover:bg-white/10"
            )}
          >
            <ThumbsUp className="size-4" />
          </button>
          <button
            type="button"
            aria-pressed={feedback === "down"}
            onClick={() => choose("down")}
            className={cn(
              "rounded-full p-1.5 transition-colors",
              feedback === "down" ? "bg-error/20 text-error" : "text-on-dark-soft hover:bg-white/10"
            )}
          >
            <ThumbsDown className="size-4" />
          </button>
        </div>
        {published ? (
          <span className="text-[13px] font-medium font-body text-success">
            Shared with class · <span className="underline underline-offset-2">View</span>
          </span>
        ) : (
          publishTrigger
        )}
      </div>
    </div>
  );
}
