"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { KeyboardHint } from "@/components/ui/badges";
import { CircleNotch } from "@phosphor-icons/react";
import { CheckGlyph, TriangleExclamationGlyph } from "@/components/ui/status-icons";
import type { QuizQuestion } from "@/lib/data/types";

export interface QuizAnswer {
  optionId: string;
  correct: boolean;
}

/**
 * Screen 4 quiz interstitial (frontend plan Part III §3, S4). Never blocks progress —
 * Skip is always visible, and a miss opens the Remediation Drawer without stopping here.
 */
export function QuizInterstitial({
  question,
  previousAnswer,
  onAnswer,
  onContinue,
  onSkip,
  onViewExplanation,
  explanationLoading,
}: {
  question: QuizQuestion;
  previousAnswer: QuizAnswer | null;
  onAnswer: (answer: QuizAnswer) => void;
  onContinue: () => void;
  onSkip: () => void;
  onViewExplanation: () => void;
  explanationLoading?: boolean;
}) {
  const [selected, setSelected] = React.useState<string | null>(previousAnswer?.optionId ?? null);
  const answered = previousAnswer !== null;

  const submit = React.useCallback(
    (optionId: string) => {
      const option = question.options.find((o) => o.id === optionId);
      if (!option) return;
      onAnswer({ optionId, correct: option.correct });
    },
    [question.options, onAnswer]
  );

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (answered) return;
      const n = Number(e.key);
      if (n >= 1 && n <= question.options.length) {
        setSelected(question.options[n - 1].id);
      }
      if (e.key === "Enter" && selected) {
        submit(selected);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answered, selected, question.options, submit]);

  const selectedOption = question.options.find((o) => o.id === (answered ? previousAnswer!.optionId : selected));

  return (
    <div className="mx-auto max-w-2xl rounded-[var(--radius-card)] border border-hairline bg-surface-card p-8">
      <p className="text-[13px] font-medium font-body uppercase tracking-[1px] text-accent-text">Practice question</p>
      <h3 className="mt-2">{question.prompt}</h3>

      <div className="mt-6 space-y-2.5" role="radiogroup" aria-label={question.prompt}>
        {question.options.map((option, i) => {
          const isSelected = option.id === selectedOption?.id;
          const showResult = answered && isSelected;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={answered}
              onClick={() => setSelected(option.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-[var(--radius-control)] border bg-canvas px-4 py-3 text-left text-[15px] font-body transition-colors",
                !answered && isSelected && "border-button-primary",
                !answered && !isSelected && "border-hairline hover:border-body",
                showResult && option.correct && "border-success bg-success/10",
                showResult && !option.correct && "border-error bg-error/10",
                answered && !isSelected && "border-hairline opacity-60"
              )}
            >
              <KeyboardHint>{i + 1}</KeyboardHint>
              <span className="flex-1 text-ink">{option.text}</span>
              {showResult && option.correct ? <CheckGlyph className="text-success" /> : null}
              {showResult && !option.correct ? <TriangleExclamationGlyph className="text-error" /> : null}
            </button>
          );
        })}
      </div>

      {answered && previousAnswer && !previousAnswer.correct && selectedOption?.tag ? (
        <p className="mt-3 text-[13px] font-medium font-body text-error">Incorrect — {selectedOption.tag}</p>
      ) : null}

      {answered && previousAnswer?.correct ? (
        <p className="mt-4 text-[14px] leading-relaxed text-body font-body">{question.correctExplanation}</p>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
        <div className="flex items-center gap-3">
          {answered && !previousAnswer?.correct ? (
            <Button variant="secondary" onClick={onViewExplanation} className="min-w-[8.5rem] justify-center gap-1.5">
              {explanationLoading ? (
                <><CircleNotch className="size-3.5 animate-spin" /> Loading&hellip;</>
              ) : (
                "View explanation"
              )}
            </Button>
          ) : null}
          {answered ? (
            <Button variant="primary" onClick={onContinue}>
              Continue
            </Button>
          ) : (
            <Button variant="primary" disabled={!selected} disabledReason="Select an answer first" onClick={() => selected && submit(selected)}>
              Check answer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
