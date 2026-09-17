"use client";

import * as React from "react";
import { CaretLeft, CaretRight, ArrowCounterClockwise, ThumbsDown, ThumbsUp, Play, Pause } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/button";
import { SparkGlyph } from "@/components/ui/status-icons";
import { CitationChip } from "@/components/ui/badges";
import { TREE_HEIGHT_CODE, TREE_HEIGHT_TRACE, type TraceStep } from "@/lib/data/trace-stepper";

// BST that mirrors the treeHeight demo trace — nodes visited in DFS order.
const TREE_NODES = [
  { id: "root", val: 7,  cx: 110, cy: 25,  visitStep: 0 },
  { id: "l",    val: 5,  cx: 55,  cy: 80,  visitStep: 1 },
  { id: "ll",   val: 2,  cx: 25,  cy: 135, visitStep: 2 },
  { id: "r",    val: 10, cx: 165, cy: 80,  visitStep: 3 },
  { id: "rr",   val: 15, cx: 195, cy: 135, visitStep: 4 },
];
const TREE_EDGES = [
  { from: "root", to: "l" },
  { from: "root", to: "r" },
  { from: "l",    to: "ll" },
  { from: "r",    to: "rr" },
];

function TreePanel({ stepIndex }: { stepIndex: number }) {
  const nodeMap = Object.fromEntries(TREE_NODES.map((n) => [n.id, n]));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-medium font-body uppercase tracking-[1px] text-on-dark-soft">
        Traversal tree
      </p>
      <svg viewBox="0 0 220 165" className="w-full" aria-hidden>
        {TREE_EDGES.map(({ from, to }) => {
          const a = nodeMap[from];
          const b = nodeMap[to];
          const active = a.visitStep <= stepIndex && b.visitStep <= stepIndex;
          return (
            <line
              key={`${from}-${to}`}
              x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
              stroke={active ? "#cc785c" : "rgba(255,255,255,0.15)"}
              strokeWidth="1.5"
              strokeDasharray={active ? "4 3" : undefined}
            />
          );
        })}
        {TREE_NODES.map((n) => {
          const visited = n.visitStep <= stepIndex;
          const isCurrent = n.visitStep === stepIndex;
          return (
            <g key={n.id}>
              <circle
                cx={n.cx} cy={n.cy} r={17}
                fill={isCurrent ? "#ffdbd0" : visited ? "rgba(204,120,92,0.18)" : "rgba(255,255,255,0.07)"}
                stroke={visited ? "#cc785c" : "rgba(255,255,255,0.2)"}
                strokeWidth="1.5"
              />
              <text
                x={n.cx} y={n.cy + 5}
                textAnchor="middle"
                fontSize="12"
                fill={isCurrent ? "#181715" : visited ? "#ffb59d" : "rgba(255,255,255,0.4)"}
                fontWeight={isCurrent ? "600" : "400"}
              >
                {n.val}
              </text>
              {/* Step order badge */}
              <circle cx={n.cx + 12} cy={n.cy - 12} r={8}
                fill={visited ? "#cc785c" : "rgba(255,255,255,0.07)"}
              />
              <text x={n.cx + 12} y={n.cy - 8} textAnchor="middle" fontSize="8"
                fill={visited ? "#fff" : "rgba(255,255,255,0.25)"}>
                {n.visitStep + 1}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Visit-order sequence bar */}
      <div>
        <p className="mb-1.5 text-[10px] font-body uppercase tracking-[1px] text-on-dark-soft">Visit order</p>
        <div className="flex items-center gap-1.5">
          {[...TREE_NODES].sort((a, b) => a.visitStep - b.visitStep).map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-[11px] font-medium font-code transition-colors duration-200",
                n.visitStep <= stepIndex ? "bg-button-primary text-on-primary" : "bg-white/10 text-on-dark-soft"
              )}
            >
              {n.val}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  publishTrigger?: React.ReactNode;
  published?: boolean;
}) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const [feedback, setFeedback] = React.useState<"up" | "down" | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const step = trace[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === trace.length - 1;

  React.useEffect(() => {
    if (!playing) return;
    if (isLast) { setPlaying(false); return; }
    const id = window.setTimeout(() => setStepIndex((i) => Math.min(trace.length - 1, i + 1)), 1800);
    return () => window.clearTimeout(id);
  }, [playing, stepIndex, isLast, trace.length]);

  function choose(f: "up" | "down") {
    setFeedback(f);
    onHelpful?.(f === "up");
  }

  return (
    <div className="rounded-[var(--radius-card)] bg-surface-dark p-6 text-on-dark">
      {/* Header */}
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

      {/* Two-column body */}
      <div className="mt-5 grid grid-cols-12 gap-6">
        {/* Left: code + call stack + variables + narration + controls */}
        <div className="col-span-7 space-y-5">
          {/* Code panel */}
          <div className="overflow-x-auto rounded-[var(--radius-control)] bg-surface-dark-soft p-4 font-code text-[13px] leading-6">
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
          <div>
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
          <div>
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

          <p aria-live="polite" className="text-[14px] text-on-dark font-body">
            {step.narration}
          </p>

          {/* Step controls + play */}
          <div className="flex items-center gap-2 border-t border-white/10 pt-4">
            <IconButton
              label="Step back"
              disabled={isFirst}
              onClick={() => { setPlaying(false); setStepIndex((i) => Math.max(0, i - 1)); }}
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
              onClick={() => { setPlaying(false); setStepIndex((i) => Math.min(trace.length - 1, i + 1)); }}
              className="text-on-dark-soft hover:bg-white/10 hover:text-on-dark disabled:opacity-30"
            >
              <CaretRight />
            </IconButton>
            <IconButton
              label="Reset"
              onClick={() => { setPlaying(false); setStepIndex(0); }}
              className="text-on-dark-soft hover:bg-white/10 hover:text-on-dark"
            >
              <ArrowCounterClockwise />
            </IconButton>
            <IconButton
              label={playing ? "Pause auto-play" : "Play auto-advance"}
              onClick={() => setPlaying((p) => !p)}
              className={cn(
                "ml-1 transition-colors",
                playing ? "text-[#ffb59d] hover:bg-white/10" : "text-on-dark-soft hover:bg-white/10 hover:text-[#ffb59d]"
              )}
            >
              {playing ? <Pause /> : <Play />}
            </IconButton>
          </div>
        </div>

        {/* Right: tree visualization */}
        <div className="col-span-5">
          <TreePanel stepIndex={Math.min(stepIndex, TREE_NODES.length - 1)} />
        </div>
      </div>

      {/* Action bar — full width */}
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
