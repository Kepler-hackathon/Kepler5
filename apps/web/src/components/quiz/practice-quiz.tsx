"use client";

import * as React from "react";
import { AppNav } from "@/components/nav/app-nav";
import { QuizBuilder } from "./quiz-builder";
import { QuizArena, type ArenaResult, type SessionQuestion } from "./quiz-arena";
import { QuizResults } from "./quiz-results";
import { apiJson, ApiError } from "@/lib/api-client";

const SAVED_SESSION_KEY = "keplerlearn:quiz:saved-session";

interface SessionRow {
  id: string;
  status: "generating" | "ready" | "in_progress" | "completed" | "cancelled" | "failed";
  questions?: SessionQuestion[];
  currentIndex: number;
}

type Stage =
  | { kind: "builder" }
  | { kind: "generating"; sessionId: string; lectureIds: string[] }
  | { kind: "arena"; sessionId: string; questions: SessionQuestion[]; lectureIds: string[]; attempt: number }
  | {
      kind: "results";
      lectureIds: string[];
      attempt: number;
      results: ArenaResult[];
      score?: { correct: number; total: number; percentage: number };
    }
  | { kind: "error"; message: string };

export function PracticeQuiz({ initialSelected }: { initialSelected?: string[] }) {
  const [stage, setStage] = React.useState<Stage>({ kind: "builder" });

  React.useEffect(() => {
    if (stage.kind === "arena") {
      window.localStorage.setItem(SAVED_SESSION_KEY, JSON.stringify({ lectureIds: stage.lectureIds }));
    } else if (stage.kind === "results") {
      window.localStorage.removeItem(SAVED_SESSION_KEY);
    }
  }, [stage]);

  async function startSession(lectureIds: string[], attempt = 0) {
    try {
      const res = await apiJson<{ sessionId: string; status: string }>("/api/practice/sessions", {
        method: "POST",
        body: JSON.stringify({ lectureIds }),
      });
      setStage({ kind: "generating", sessionId: res.sessionId, lectureIds });
      pollSession(res.sessionId, lectureIds, attempt);
    } catch (err) {
      setStage({ kind: "error", message: err instanceof ApiError ? err.message : "Failed to start quiz" });
    }
  }

  async function pollSession(sessionId: string, lectureIds: string[], attempt: number) {
    for (let i = 0; i < 30; i++) {
      let session: SessionRow;
      try {
        session = await apiJson<SessionRow>(`/api/practice/sessions/${sessionId}`);
      } catch (err) {
        setStage({ kind: "error", message: err instanceof ApiError ? err.message : "Failed to check quiz status" });
        return;
      }
      if (session.status === "ready" || session.status === "in_progress") {
        const questions = session.questions ?? [];
        if (questions.length === 0) {
          setStage({ kind: "error", message: "No questions were generated for the selected lectures." });
          return;
        }
        setStage({ kind: "arena", sessionId, questions, lectureIds, attempt });
        return;
      }
      if (session.status === "failed" || session.status === "cancelled") {
        setStage({ kind: "error", message: "Quiz generation failed. Try again." });
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    setStage({ kind: "error", message: "Quiz generation is taking longer than expected. Try again shortly." });
  }

  async function finishArena(sessionId: string, lectureIds: string[], attempt: number, results: ArenaResult[]) {
    try {
      const score = await apiJson<{ scoreCorrect: number; scoreTotal: number; percentage: number }>(
        `/api/practice/sessions/${sessionId}/complete`,
        { method: "POST" },
      );
      setStage({
        kind: "results",
        lectureIds,
        attempt,
        results,
        score: { correct: score.scoreCorrect, total: score.scoreTotal, percentage: score.percentage },
      });
    } catch {
      // Still show local results even if finalizing the score server-side failed.
      setStage({ kind: "results", lectureIds, attempt, results });
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav courseId="" course={null} activeHref="/quizzes" />
      <main className="px-6 py-10">
        {stage.kind === "builder" ? (
          <QuizBuilder initialSelected={initialSelected} onGenerate={(lectureIds) => startSession(lectureIds)} />
        ) : stage.kind === "generating" ? (
          <p className="mx-auto max-w-lg py-20 text-center text-[16px] text-body font-body" aria-live="polite">
            Building your quiz…
          </p>
        ) : stage.kind === "arena" ? (
          <QuizArena
            key={stage.attempt}
            sessionId={stage.sessionId}
            questions={stage.questions}
            onFinish={(results) => finishArena(stage.sessionId, stage.lectureIds, stage.attempt, results)}
            onExit={() => setStage({ kind: "builder" })}
          />
        ) : stage.kind === "results" ? (
          <QuizResults
            results={stage.results}
            score={stage.score}
            onRetakeSame={() => startSession(stage.lectureIds, stage.attempt + 1)}
            onBackToBuilder={() => setStage({ kind: "builder" })}
          />
        ) : (
          <div className="mx-auto max-w-lg py-20 text-center">
            <p className="text-[15px] text-error font-body">{stage.message}</p>
            <button
              className="mt-4 text-[14px] text-muted font-body underline"
              onClick={() => setStage({ kind: "builder" })}
            >
              Back to quiz builder
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
