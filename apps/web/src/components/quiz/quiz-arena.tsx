"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { KeyboardHint } from "@/components/ui/badges";
import { CheckGlyph, TriangleExclamationGlyph } from "@/components/ui/status-icons";
import { apiJson } from "@/lib/api-client";

export interface SessionQuestion {
  id: string;
  promptMd: string;
  options: { key: string; text: string }[];
  conceptLabel?: string;
  lectureId?: string;
}

export interface ArenaResult {
  question: SessionQuestion;
  status: "correct" | "incorrect" | "skipped";
  selectedKey?: string;
  correctKey?: string;
  explanationMd?: string;
}

/** S6b Arena: explicit Next question (D9, no auto-advance), Skip, no going back. */
export function QuizArena({
  sessionId,
  questions,
  onFinish,
  onExit,
}: {
  sessionId: string;
  questions: SessionQuestion[];
  onFinish: (results: ArenaResult[]) => void;
  onExit?: () => void;
}) {
  const [index, setIndex] = React.useState(0);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState<{ correctKey: string; explanation: string | null } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [results, setResults] = React.useState<ArenaResult[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const question = questions[index];
  const isLast = index === questions.length - 1;

  function advance(result: ArenaResult) {
    const next = [...results, result];
    setResults(next);
    if (isLast) {
      onFinish(next);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setSubmitted(null);
  }

  async function skip() {
    setError(null);
    try {
      await apiJson(`/api/practice/sessions/${sessionId}/answers`, {
        method: "POST",
        body: JSON.stringify({ questionId: question.id, skipped: true }),
      });
      advance({ question, status: "skipped" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to skip question");
    }
  }

  async function submit() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiJson<{ isCorrect: boolean; correctKey: string; explanation: string | null }>(
        `/api/practice/sessions/${sessionId}/answers`,
        { method: "POST", body: JSON.stringify({ questionId: question.id, selectedKey: selected }) },
      );
      setSubmitted({ correctKey: res.correctKey, explanation: res.explanation });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer");
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (!submitted) return;
    advance({
      question,
      status: selected === submitted.correctKey ? "correct" : "incorrect",
      selectedKey: selected ?? undefined,
      correctKey: submitted.correctKey,
      explanationMd: submitted.explanation ?? undefined,
    });
  }

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (submitted) {
        if (e.key === "Enter") next();
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= question.options.length) setSelected(question.options[n - 1].key);
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
      <h2 className="mt-2 text-center text-[26px]">{question.promptMd}</h2>

      <div className="mt-6 space-y-2.5" role="radiogroup" aria-label={question.promptMd}>
        {question.options.map((option, i) => {
          const isSelected = option.key === selected;
          const isCorrectOption = submitted && option.key === submitted.correctKey;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!!submitted}
              onClick={() => setSelected(option.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-[var(--radius-control)] border bg-surface-card px-4 py-3 text-left text-[15px] font-body transition-colors",
                !submitted && isSelected && "border-button-primary",
                !submitted && !isSelected && "border-hairline hover:border-body",
                submitted && isCorrectOption && "border-success bg-success/10",
                submitted && isSelected && !isCorrectOption && "border-error bg-error/10",
                submitted && !isSelected && !isCorrectOption && "border-hairline opacity-60"
              )}
            >
              <KeyboardHint>{i + 1}</KeyboardHint>
              <span className="flex-1 text-ink">{option.text}</span>
              {submitted && isCorrectOption ? <CheckGlyph className="text-success" /> : null}
              {submitted && isSelected && !isCorrectOption ? <TriangleExclamationGlyph className="text-error" /> : null}
            </button>
          );
        })}
      </div>

      {submitted?.explanation ? (
        <p className="mt-4 text-[14px] leading-relaxed text-body font-body">{submitted.explanation}</p>
      ) : null}
      {error ? <p className="mt-4 text-[13px] text-error font-body">{error}</p> : null}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={skip} disabled={!!submitted || submitting}>
          Skip
        </Button>
        {submitted ? (
          <Button variant="primary" onClick={next}>
            {isLast ? "See results" : "Next question"}
          </Button>
        ) : (
          <Button variant="primary" disabled={!selected || submitting} disabledReason="Select an answer first" onClick={submit}>
            Check answer
          </Button>
        )}
      </div>
    </div>
  );
}
