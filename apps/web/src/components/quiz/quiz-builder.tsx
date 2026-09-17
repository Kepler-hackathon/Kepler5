"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { moduleDetails } from "@/lib/data/curriculum";
import { questionsForLectures } from "@/lib/data/quiz-bank";

export function QuizBuilder({
  onGenerate,
  initialSelected,
}: {
  onGenerate: (lectureNumbers: number[]) => void;
  initialSelected?: number[];
}) {
  const [selected, setSelected] = React.useState<Set<number>>(new Set(initialSelected));
  const [generating, setGenerating] = React.useState(false);

  function toggleLecture(number: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  }

  function toggleModule(lectureNumbers: number[], allSelected: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) lectureNumbers.forEach((n) => next.delete(n));
      else lectureNumbers.forEach((n) => next.add(n));
      return next;
    });
  }

  const selectedCount = selected.size;
  const estimatedQuestions = questionsForLectures([...selected]).length;

  function generate() {
    if (selectedCount === 0) return;
    setGenerating(true);
    window.setTimeout(() => onGenerate([...selected]), 900);
  }

  if (generating) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p aria-live="polite" className="text-[16px] text-body font-body">
          Generating about {estimatedQuestions} {estimatedQuestions === 1 ? "question" : "questions"} from{" "}
          {selectedCount} {selectedCount === 1 ? "lecture" : "lectures"}…
        </p>
        <Button variant="ghost" className="mt-4" onClick={() => setGenerating(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1>Build a practice quiz</h1>
      <p className="mt-1 text-[15px] text-muted font-body">Select the lectures you want to be quizzed on.</p>

      {initialSelected && initialSelected.length === 0 ? (
        <p className="mt-3 rounded-[var(--radius-control)] border border-hairline bg-surface-card px-3 py-2 text-[13px] text-muted font-body">
          Your conversation didn&rsquo;t cite a specific lecture, so nothing&rsquo;s preselected — pick a few below.
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        {moduleDetails.map((m) => {
          const lectureNumbers = m.lectures.map((l) => l.number);
          const selectedInModule = lectureNumbers.filter((n) => selected.has(n));
          const allSelected = selectedInModule.length === lectureNumbers.length;
          const indeterminate = selectedInModule.length > 0 && !allSelected;

          return (
            <div key={m.id} className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = indeterminate;
                  }}
                  onChange={() => toggleModule(lectureNumbers, allSelected)}
                  className="size-4 accent-[var(--color-button-primary)]"
                />
                <span className="text-[15px] font-medium font-body text-ink">
                  Module {m.number}: {m.title}
                </span>
              </label>
              <div className="mt-2 ml-7 space-y-1.5">
                {m.lectures.map((l) => (
                  <label key={l.number} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(l.number)}
                      onChange={() => toggleLecture(l.number)}
                      className="size-4 accent-[var(--color-button-primary)]"
                    />
                    <span className="text-[14px] text-body font-body">
                      Lecture {l.number}: {l.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-[13px] text-muted font-body">
          {selectedCount === 0
            ? "Select at least one lecture"
            : `About ${estimatedQuestions} ${estimatedQuestions === 1 ? "question" : "questions"} from ${selectedCount} ${selectedCount === 1 ? "lecture" : "lectures"}`}
        </p>
        <Button
          variant="primary"
          disabled={selectedCount === 0}
          disabledReason="Select at least one lecture"
          onClick={generate}
        >
          Generate quiz
        </Button>
      </div>
    </div>
  );
}
