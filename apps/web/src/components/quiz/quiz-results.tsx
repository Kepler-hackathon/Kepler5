"use client";

import * as React from "react";
import Link from "next/link";
import { CaretDown, CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { CheckGlyph, TriangleExclamationGlyph, DashGlyph } from "@/components/ui/status-icons";
import type { ArenaResult } from "./quiz-arena";

function ResultRow({
  result,
  alreadyLoaded,
  onLoaded,
}: {
  result: ArenaResult;
  alreadyLoaded: boolean;
  onLoaded: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"explanation" | "interactive">("explanation");

  if (result.status === "correct") {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-control)] border border-hairline bg-surface-card px-4 py-3">
        <CheckGlyph className="text-success" />
        <span className="text-[14px] font-body text-ink">{result.question.promptMd}</span>
      </div>
    );
  }

  function toggle() {
    if (!expanded && !alreadyLoaded) {
      setLoading(true);
      window.setTimeout(() => {
        setLoading(false);
        onLoaded();
      }, 450);
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
        <span className="flex-1 text-[14px] font-body text-ink">{result.question.promptMd}</span>
        <span className="text-[12px] text-muted font-body">{result.status === "incorrect" ? "Missed" : "Skipped"}</span>
        <CaretDown className={cn("size-4 text-muted transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded ? (
        <div className="mt-3 border-t border-hairline pt-3">
          {loading ? (
            <CircleNotch className="size-4 animate-spin text-muted" />
          ) : (
            <p className="text-[13px] leading-relaxed text-body font-body">
              {result.explanationMd ?? "No explanation available."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function QuizResults({
  results,
  score,
  onRetakeSame,
  onBackToBuilder,
}: {
  results: ArenaResult[];
  /** Authoritative score from POST /api/practice/sessions/[id]/complete; falls back to a local count. */
  score?: { correct: number; total: number; percentage: number };
  onRetakeSame: () => void;
  onBackToBuilder?: () => void;
}) {
  const [loadedIds, setLoadedIds] = React.useState<Set<string>>(new Set());
  function markLoaded(id: string) {
    setLoadedIds((prev) => new Set([...prev, id]));
  }

  const correct = score?.correct ?? results.filter((r) => r.status === "correct").length;
  const total = score?.total ?? results.length;
  const percent = score?.percentage ?? Math.round((correct / total) * 100);

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

      <div className="mt-8 space-y-2 text-left">
        {results.map((r, i) => (
          <ResultRow
            key={r.question.id + i}
            result={r}
            alreadyLoaded={loadedIds.has(r.question.id)}
            onLoaded={() => markLoaded(r.question.id)}
          />
        ))}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {onBackToBuilder ? (
          <Button variant="ghost" onClick={onBackToBuilder}>
            Change topics
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onRetakeSame}>
          New quiz, same topics
        </Button>
        <Button asChild variant="primary">
          <Link href="/courses">Back to courses</Link>
        </Button>
      </div>
    </div>
  );
}
