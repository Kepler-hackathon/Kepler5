"use client";

import * as React from "react";
import { Warning } from "@phosphor-icons/react";
import { AppNav } from "@/components/nav/app-nav";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import { apiJson } from "@/lib/api-client";
import { useIdentity } from "@/lib/identity";

interface LectureAnalytics {
  lectureId: string;
  title: string;
  cellState: "noData" | "red" | "amber" | "green";
  wrongRate: number;
  attemptCount: number;
  faqCount: number;
  engagedStudentCount: number;
  insufficient: boolean;
}

function accuracyRowColor(l: LectureAnalytics) {
  if (l.insufficient || l.attemptCount === 0) return "text-muted";
  const accuracy = Math.round((1 - l.wrongRate) * 100);
  if (accuracy >= 75) return "text-success-text";
  if (accuracy >= 50) return "text-warning-text";
  return "text-error";
}

export function Analytics({ courseId }: { courseId: string }) {
  const identity = useIdentity();
  const [lectures, setLectures] = React.useState<LectureAnalytics[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showAllLectures, setShowAllLectures] = React.useState(false);

  React.useEffect(() => {
    if (!identity) return;
    apiJson<{ lectures: LectureAnalytics[] }>("/api/analytics/lectures")
      .then((r) => setLectures(r.lectures))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load analytics"));
  }, [identity]);

  if (!identity) {
    return <div className="min-h-screen bg-canvas p-10 text-[14px] text-muted font-body">Pick a role first.</div>;
  }

  const struggling = (lectures ?? [])
    .filter((l) => l.cellState === "red")
    .sort((a, b) => b.wrongRate - a.wrongRate);

  const withData = (lectures ?? []).filter((l) => !l.insufficient && l.attemptCount > 0);
  const totalAttempts = withData.reduce((sum, l) => sum + l.attemptCount, 0);
  const avgAccuracy =
    withData.length > 0
      ? Math.round((withData.reduce((sum, l) => sum + (1 - l.wrongRate), 0) / withData.length) * 100)
      : null;
  const openQuestions = (lectures ?? []).reduce((sum, l) => sum + l.faqCount, 0);

  const visibleLectures = showAllLectures ? (lectures ?? []) : (lectures ?? []).slice(0, 8);

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav courseId={courseId} course={null} activeHref={`/course/${courseId}/analytics`} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-[13px] font-medium font-body uppercase tracking-[1px] text-accent-text">Teacher view</p>
        <h1 className="mt-1">Class Analytics</h1>

        {error ? <p className="mt-4 text-[14px] text-error font-body">{error}</p> : null}

        {/* Stat tiles — only metrics the backend actually tracks (no enrollment/completion table exists) */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-5">
            <p className="text-[13px] text-muted font-body">Total quiz attempts</p>
            <p className="mt-1 text-[28px] font-display text-ink">{totalAttempts}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-5">
            <p className="text-[13px] text-muted font-body">Avg accuracy</p>
            <p className="mt-1 text-[28px] font-display text-ink">{avgAccuracy === null ? "—" : `${avgAccuracy}%`}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-5">
            <p className="text-[13px] text-muted font-body">Open questions</p>
            <p className="mt-1 text-[28px] font-display text-ink">{openQuestions}</p>
          </div>
        </div>

        {/* Struggling topics */}
        <section className="mt-10">
          <h2 className="text-[24px]">Topics needing attention</h2>
          <div className="mt-4">
            {lectures === null ? (
              <p className="text-[14px] text-muted font-body">Loading…</p>
            ) : struggling.length === 0 ? (
              <p className="text-[14px] text-muted font-body">No lecture is flagged red yet (or not enough attempts recorded).</p>
            ) : (
              <div className="space-y-3">
                {struggling.map((l) => (
                  <div key={l.lectureId} className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Warning className="size-4 shrink-0 text-error" weight="fill" />
                        <span className="text-[14px] font-medium font-body text-ink">{l.title}</span>
                      </div>
                      <span className="shrink-0 text-[13px] font-medium font-body text-error">
                        Class accuracy: {Math.round((1 - l.wrongRate) * 100)}%
                      </span>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={Math.round((1 - l.wrongRate) * 100)} label={`${l.title} accuracy`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Per-lecture table */}
        <section className="mt-10">
          <h2 className="text-[24px]">Quiz performance by lecture</h2>
          <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-hairline bg-surface-card">
            <table className="w-full border-collapse text-[13px] font-body">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="px-4 py-3 text-left text-muted font-medium">Lecture</th>
                  <th className="px-4 py-3 text-right text-muted font-medium">Attempts</th>
                  <th className="px-4 py-3 text-right text-muted font-medium">Engaged students</th>
                  <th className="px-4 py-3 text-right text-muted font-medium">Avg Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {lectures === null ? (
                  <tr>
                    <td className="px-4 py-3 text-muted font-body" colSpan={4}>Loading…</td>
                  </tr>
                ) : lectures.length === 0 ? (
                  <tr>
                    <td className="px-4 py-3 text-muted font-body" colSpan={4}>No published lectures yet.</td>
                  </tr>
                ) : (
                  visibleLectures.map((l) => (
                    <tr key={l.lectureId} className="border-b border-hairline/50 last:border-0">
                      <td className="px-4 py-2.5 text-ink">{l.title}</td>
                      <td className="px-4 py-2.5 text-right text-body">{l.attemptCount}</td>
                      <td className="px-4 py-2.5 text-right text-body">{l.engagedStudentCount}</td>
                      <td className={cn("px-4 py-2.5 text-right font-medium", accuracyRowColor(l))}>
                        {l.insufficient || l.attemptCount === 0 ? "—" : `${Math.round((1 - l.wrongRate) * 100)}%`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {(lectures ?? []).length > 8 ? (
            <button
              onClick={() => setShowAllLectures((v) => !v)}
              className="mt-3 text-[13px] font-medium font-body text-accent-text hover:underline underline-offset-2"
            >
              {showAllLectures ? "Show fewer" : `Show all ${(lectures ?? []).length} lectures`}
            </button>
          ) : null}
        </section>
      </main>
    </div>
  );
}
