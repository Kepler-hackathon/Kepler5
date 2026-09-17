"use client";

import * as React from "react";
import { CaretDown, CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { CheckGlyph, TriangleExclamationGlyph, DashGlyph } from "@/components/ui/status-icons";
import { moduleDetails } from "@/lib/data/curriculum";
import type { ArenaResult } from "./quiz-arena";

function ResultRow({ result }: { result: ArenaResult }) {
  const [expanded, setExpanded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  if (result.status === "correct") {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-control)] border border-hairline bg-surface-card px-4 py-3">
        <CheckGlyph className="text-success" />
        <span className="text-[14px] font-body text-ink">{result.question.prompt}</span>
      </div>
    );
  }

  function toggle() {
    if (!expanded) {
      setLoading(true);
      window.setTimeout(() => setLoading(false), 450);
    }
    setExpanded((v) => !v);
  }

  return (
    <div className="rounded-[var(--radius-control)] border border-hairline bg-surface-card px-4 py-3">
      <button onClick={toggle} className="flex w-full items-center gap-3 text-left">
        {result.status === "incorrect" ? (
          <TriangleExclamationGlyph className="text-error" />
        ) : (
          <DashGlyph className="text-muted" />
        )}
        <span className="flex-1 text-[14px] font-body text-ink">{result.question.prompt}</span>
        <span className="text-[12px] text-muted font-body">{result.status === "incorrect" ? "Missed" : "Skipped"}</span>
        <CaretDown className={cn("size-4 text-muted transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded ? (
        <div className="mt-3 border-t border-hairline pt-3">
          {loading ? (
            <CircleNotch className="size-4 animate-spin text-muted" />
          ) : (
            <p className="text-[13px] leading-relaxed text-body font-body">{result.question.correctExplanation}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function QuizResults({ results, onRetakeSame }: { results: ArenaResult[]; onRetakeSame: () => void }) {
  const correct = results.filter((r) => r.status === "correct").length;
  const total = results.length;
  const percent = Math.round((correct / total) * 100);

  const involvedModules = moduleDetails.filter((m) =>
    m.lectures.some((l) => results.some((r) => r.question.lectureNumber === l.number))
  );

  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-[13px] font-medium font-body uppercase tracking-[1px] text-accent-text">Quiz results</p>
      <h1 className="mt-1">
        {correct} of {total} correct
      </h1>
      <p className="mt-2 text-[15px] text-muted font-body">
        {percent === 100
          ? "Perfect score! Try a harder mix next time."
          : percent === 0
            ? "Everyone starts somewhere — try reviewing the explanations below."
            : `${percent}% correct.`}
      </p>

      {involvedModules.length > 1 ? (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {involvedModules.map((m) => {
            const moduleResults = results.filter((r) => m.lectures.some((l) => l.number === r.question.lectureNumber));
            const moduleCorrect = moduleResults.filter((r) => r.status === "correct").length;
            return (
              <span key={m.id} className="rounded-full border border-hairline bg-surface-card px-3 py-1 text-[12px] text-muted font-body">
                Module {m.number}: {moduleCorrect}/{moduleResults.length}
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="mt-8 space-y-2 text-left">
        {results.map((r, i) => (
          <ResultRow key={r.question.id + i} result={r} />
        ))}
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Button variant="secondary" onClick={onRetakeSame}>
          New quiz, same topics
        </Button>
      </div>
    </div>
  );
}
