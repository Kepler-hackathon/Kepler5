"use client";

import * as React from "react";
import { ThumbsUp, ThumbsDown } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { SparkGlyph } from "@/components/ui/status-icons";

interface PredictCheckProps {
  title: string;
  scenario: string;
  options: { id: string; label: string }[];
  correctId: string;
  explanation: string;
}

export function PredictCheckWidget({ title, scenario, options, correctId, explanation }: PredictCheckProps) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [checked, setChecked] = React.useState(false);
  const [feedback, setFeedback] = React.useState<"up" | "down" | null>(null);

  const isCorrect = selected === correctId;

  function check() {
    if (!selected) return;
    setChecked(true);
  }

  return (
    <div className="rounded-[var(--radius-card)] bg-surface-dark p-6 text-on-dark">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium font-body uppercase tracking-[1px] text-on-dark-soft">
          Predict &amp; Check · {title}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-button-primary px-3 py-1 text-[11px] font-semibold font-body uppercase tracking-[1.5px] text-on-primary">
          <SparkGlyph />
          AI generated
        </div>
      </div>

      <p className="mt-4 text-[14px] leading-relaxed text-on-dark font-body">{scenario}</p>

      <div className="mt-4 space-y-2" role="radiogroup">
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          const showResult = checked && isSelected;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={checked}
              onClick={() => setSelected(opt.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-[var(--radius-control)] border px-4 py-3 text-left text-[14px] font-body transition-colors",
                !checked && isSelected && "border-white/40 bg-white/10 text-on-dark",
                !checked && !isSelected && "border-white/15 bg-white/5 text-on-dark hover:border-white/30",
                showResult && opt.id === correctId && "border-success/60 bg-success/10 text-on-dark",
                showResult && opt.id !== correctId && "border-error/60 bg-error/10 text-on-dark",
                checked && !isSelected && "border-white/10 bg-transparent text-on-dark-soft opacity-60"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {!checked ? (
        <button
          type="button"
          disabled={!selected}
          onClick={check}
          className={cn(
            "mt-4 rounded-[var(--radius-control)] bg-button-primary px-4 py-2 text-[14px] font-medium font-body text-on-primary transition-opacity",
            !selected && "cursor-not-allowed opacity-40"
          )}
        >
          Check my answer
        </button>
      ) : (
        <div className="mt-4">
          <p className={cn("text-[13px] font-medium font-body", isCorrect ? "text-success" : "text-error")}>
            {isCorrect ? "Correct!" : `Incorrect — the correct answer is: ${options.find((o) => o.id === correctId)?.label}`}
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-on-dark-soft font-body">{explanation}</p>
        </div>
      )}

      {/* Helpful? */}
      <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
        <span className="text-[13px] text-on-dark-soft font-body">Helpful?</span>
        <button
          type="button"
          aria-pressed={feedback === "up"}
          onClick={() => setFeedback(feedback === "up" ? null : "up")}
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
          onClick={() => setFeedback(feedback === "down" ? null : "down")}
          className={cn(
            "rounded-full p-1.5 transition-colors",
            feedback === "down" ? "bg-error/20 text-error" : "text-on-dark-soft hover:bg-white/10"
          )}
        >
          <ThumbsDown className="size-4" />
        </button>
      </div>
    </div>
  );
}
