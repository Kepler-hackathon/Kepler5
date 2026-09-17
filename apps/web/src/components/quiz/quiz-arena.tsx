"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { KeyboardHint } from "@/components/ui/badges";
import { CheckGlyph, TriangleExclamationGlyph } from "@/components/ui/status-icons";
import type { BankQuestion } from "@/lib/data/quiz-bank";

export interface ArenaResult {
  question: BankQuestion;
  status: "correct" | "incorrect" | "skipped";
  selectedOptionId?: string;
}

/** S6b Arena: explicit Next question (D9, no auto-advance), Skip, no going back. */
export function QuizArena({
  questions,
  onFinish,
  onExit,
}: {
  questions: BankQuestion[];
  onFinish: (results: ArenaResult[]) => void;
  onExit?: () => void;
}) {
  const [index, setIndex] = React.useState(0);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [results, setResults] = React.useState<ArenaResult[]>([]);

  const question = questions[index];
  const isLast = index === questions.length - 1;

  const submit = React.useCallback(() => {
    if (!selected) return;
    setSubmitted(true);
  }, [selected]);

  function advance(result: ArenaResult) {
    const next = [...results, result];
    setResults(next);
    if (isLast) {
      onFinish(next);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setSubmitted(false);
  }

  function skip() {
    advance({ question, status: "skipped" });
  }

  function next() {
    const option = question.options.find((o) => o.id === selected);
    advance({ question, status: option?.correct ? "correct" : "incorrect", selectedOptionId: selected ?? undefined });
  }

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (submitted) {
        if (e.key === "Enter") next();
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= question.options.length) setSelected(question.options[n - 1].id);
      if (e.key === "Enter" && selected) submit();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, selected, question]);

  function handleExit() {
    if (!onExit) return;
    if (index === 0 || window.confirm("Leave quiz? Your progress won't be saved.")) {
      onExit();
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {onExit ? (
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={handleExit}
            className="flex items-center gap-1.5 text-[13px] text-muted font-body hover:text-ink"
          >
            ← Back to quiz builder
          </button>
          <span className="text-[13px] text-muted font-body">
            Question {index + 1} of {questions.length}
          </span>
        </div>
      ) : null}
      <div className="flex items-center justify-center gap-2" aria-label={`Question ${index + 1} of ${questions.length}`}>
        {questions.map((q, i) => (
          <span
            key={q.id}
            className={cn(
              "size-2 rounded-full",
              i < index
                ? results[i]?.status === "correct"
                  ? "bg-success"
                  : results[i]?.status === "incorrect"
                    ? "bg-error"
                    : "bg-hairline"
                : i === index
                  ? "bg-button-primary"
                  : "bg-hairline"
            )}
          />
        ))}
      </div>

      <p className="mt-6 text-center text-[13px] text-muted font-body">
        Question {index + 1} of {questions.length}
      </p>
      <h2 className="mt-2 text-center text-[26px]">{question.prompt}</h2>

      <div className="mt-6 space-y-2.5" role="radiogroup" aria-label={question.prompt}>
        {question.options.map((option, i) => {
          const isSelected = option.id === selected;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={submitted}
              onClick={() => setSelected(option.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-[var(--radius-control)] border bg-surface-card px-4 py-3 text-left text-[15px] font-body transition-colors",
                !submitted && isSelected && "border-button-primary",
                !submitted && !isSelected && "border-hairline hover:border-body",
                submitted && isSelected && option.correct && "border-success bg-success/10",
                submitted && isSelected && !option.correct && "border-error bg-error/10",
                submitted && !isSelected && "border-hairline opacity-60"
              )}
            >
              <KeyboardHint>{i + 1}</KeyboardHint>
              <span className="flex-1 text-ink">{option.text}</span>
              {submitted && isSelected && option.correct ? <CheckGlyph className="text-success" /> : null}
              {submitted && isSelected && !option.correct ? <TriangleExclamationGlyph className="text-error" /> : null}
            </button>
          );
        })}
      </div>

      {submitted ? (
        <p className="mt-4 text-[14px] leading-relaxed text-body font-body">{question.correctExplanation}</p>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={skip} disabled={submitted}>
          Skip
        </Button>
        {submitted ? (
          <Button variant="primary" onClick={next}>
            {isLast ? "See results" : "Next question"}
          </Button>
        ) : (
          <Button variant="primary" disabled={!selected} disabledReason="Select an answer first" onClick={submit}>
            Check answer
          </Button>
        )}
      </div>
    </div>
  );
}
