"use client";

import * as React from "react";
import { AppNav } from "@/components/nav/app-nav";
import { QuizBuilder } from "./quiz-builder";
import { QuizArena, type ArenaResult } from "./quiz-arena";
import { QuizResults } from "./quiz-results";
import { questionsForLectures } from "@/lib/data/quiz-bank";

const SAVED_SESSION_KEY = "keplerlearn:quiz:saved-session";

type Stage =
  | { kind: "builder" }
  | { kind: "arena"; lectureNumbers: number[]; attempt: number }
  | { kind: "results"; lectureNumbers: number[]; attempt: number; results: ArenaResult[] };

export function PracticeQuiz({ courseId, initialSelected }: { courseId: string; initialSelected?: number[] }) {
  const [stage, setStage] = React.useState<Stage>({ kind: "builder" });

  React.useEffect(() => {
    if (stage.kind === "arena") {
      window.localStorage.setItem(SAVED_SESSION_KEY, JSON.stringify({ lectureNumbers: stage.lectureNumbers }));
    } else if (stage.kind === "results") {
      window.localStorage.removeItem(SAVED_SESSION_KEY);
    }
  }, [stage]);

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav courseId={courseId} activeHref="/quizzes" />
      <main className="px-6 py-10">
        {stage.kind === "builder" ? (
          <QuizBuilder
            initialSelected={initialSelected}
            onGenerate={(lectureNumbers) => setStage({ kind: "arena", lectureNumbers, attempt: 0 })}
          />
        ) : stage.kind === "arena" ? (
          <QuizArena
            key={stage.attempt}
            questions={questionsForLectures(stage.lectureNumbers)}
            onFinish={(results) => setStage({ kind: "results", lectureNumbers: stage.lectureNumbers, attempt: stage.attempt, results })}
            onExit={() => setStage({ kind: "builder" })}
          />
        ) : (
          <QuizResults
            results={stage.results}
            onRetakeSame={() =>
              setStage({ kind: "arena", lectureNumbers: stage.lectureNumbers, attempt: stage.attempt + 1 })
            }
            onBackToBuilder={() => setStage({ kind: "builder" })}
          />
        )}
      </main>
    </div>
  );
}
