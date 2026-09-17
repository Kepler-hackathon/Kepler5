"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { CheckGlyph, TriangleExclamationGlyph } from "@/components/ui/status-icons";
import type { QuizQuestion } from "@/lib/data/types";

/** "Generate Mini-Quiz" chip result — answered inline, no drawer (frontend plan S4 AI Copilot tab). */
export function InlineQuizCard({ question }: { question: QuizQuestion }) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const answered = selected !== null;

  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-canvas p-4">
      <p className="text-[14px] font-medium font-body text-ink">{question.prompt}</p>
      <div className="mt-3 space-y-1.5">
        {question.options.map((option) => {
          const isSelected = option.id === selected;
          return (
            <button
              key={option.id}
              type="button"
              disabled={answered}
              onClick={() => setSelected(option.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-[var(--radius-control)] border px-3 py-2 text-left text-[13px] font-body transition-colors",
                !answered && "border-hairline hover:border-body",
                answered && isSelected && option.correct && "border-success bg-success/10",
                answered && isSelected && !option.correct && "border-error bg-error/10",
                answered && !isSelected && "border-hairline opacity-50"
              )}
            >
              <span className="text-ink">{option.text}</span>
              {answered && isSelected && option.correct ? <CheckGlyph className="text-success" /> : null}
              {answered && isSelected && !option.correct ? <TriangleExclamationGlyph className="text-error" /> : null}
            </button>
          );
        })}
      </div>
      {answered ? <p className="mt-3 text-[13px] leading-relaxed text-muted font-body">{question.correctExplanation}</p> : null}
    </div>
  );
}
