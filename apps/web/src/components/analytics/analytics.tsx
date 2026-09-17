"use client";

import * as React from "react";
import { DownloadSimple, ArrowUp } from "@phosphor-icons/react";
import { AppNav } from "@/components/nav/app-nav";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import { apiJson } from "@/lib/api-client";
import { useIdentity } from "@/lib/identity";
import { SlideHeatmap } from "./slide-heatmap";
import { SlideInspector } from "./slide-inspector";

export interface LectureAnalytics {
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
  const [selectedLectureId, setSelectedLectureId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!identity) return;
    apiJson<{ lectures: LectureAnalytics[] }>("/api/analytics/lectures")
      .then((r) => {
        setLectures(r.lectures);
        // Auto-select first critical lecture if any
        const firstRed = r.lectures.find((l) => l.cellState === "red");
        if (firstRed) setSelectedLectureId(firstRed.lectureId);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load analytics"),
      );
  }, [identity]);

  if (!identity) {
    return (
      <div className="min-h-screen bg-canvas p-10 text-[14px] text-muted font-body">
        Pick a role first.
      </div>
    );
  }

  const withData = (lectures ?? []).filter(
    (l) => !l.insufficient && l.attemptCount > 0,
  );
  const totalAttempts = withData.reduce((sum, l) => sum + l.attemptCount, 0);
  const avgAccuracy =
    withData.length > 0
      ? Math.round(
          (withData.reduce((sum, l) => sum + (1 - l.wrongRate), 0) /
            withData.length) *
            100,
        )
      : null;
  const openQuestions = (lectures ?? []).reduce(
    (sum, l) => sum + l.faqCount,
    0,
  );
  const totalEngaged = (lectures ?? []).reduce(
    (sum, l) => sum + l.engagedStudentCount,
    0,
  );
  const criticalCount = (lectures ?? []).filter(
    (l) => l.cellState === "red",
  ).length;

  const selectedLecture =
    selectedLectureId != null
      ? (lectures ?? []).find((l) => l.lectureId === selectedLectureId) ?? null
      : null;

  const visibleLectures = showAllLectures
    ? (lectures ?? [])
    : (lectures ?? []).slice(0, 8);

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav courseId={courseId} course={null} activeHref={`/course/${courseId}/analytics`} />
      <main className="w-full pt-16 bg-canvas min-h-screen">
        <div className="flex flex-col w-full">
          {/* Breadcrumb & sync beacon */}
          <div className="w-full px-6 pt-6 pb-2">
            <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] font-semibold font-body uppercase tracking-[0.04em] text-muted">
                <span className="hover:text-ink transition-colors cursor-pointer">Courses</span>
                <span className="text-hairline">/</span>
                <span className="hover:text-ink transition-colors cursor-pointer">Course</span>
                <span className="text-hairline">/</span>
                <span className="text-accent-text font-medium">Analytics &amp; Learning Diagnostics</span>
              </nav>
              <div className="flex items-center gap-2 text-[12px] font-mono text-muted bg-surface-card px-3 py-1 rounded-full w-fit">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span>Telemetry Synchronized</span>
              </div>
            </div>
          </div>

          {/* Editorial headline + filter bar */}
          <section className="w-full px-6 pb-4">
            <div className="max-w-[1400px] mx-auto bg-surface-lowest rounded-xl p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-1 max-w-3xl">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-surface-card text-muted font-body text-[11px] font-semibold tracking-wider uppercase">
                    <span>Pedagogical Diagnostic Workspace</span>
                    <span className="text-hairline">•</span>
                    <span>Faculty View</span>
                  </div>
                  <h1 className="text-[36px] font-headline text-ink tracking-tight leading-tight">
                    Class Analytics
                  </h1>
                  <p className="text-[15px] text-body font-body max-w-2xl">
                    Empirical diagnostic review across enrolled students, interstitial quiz
                    submissions, and slide-tagged micro-inquiries.
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="inline-flex items-center bg-surface-card rounded-lg px-3 py-2 text-ink font-body text-[13px] cursor-pointer hover:bg-surface-cream-strong transition-colors gap-1">
                    <span className="text-muted font-normal">Section:</span>
                    <span>All Sections</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-muted ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="inline-flex items-center bg-surface-card rounded-lg px-3 py-2 text-ink font-body text-[13px] cursor-pointer hover:bg-surface-cream-strong transition-colors gap-1">
                    <span className="text-muted font-normal">Date:</span>
                    <span>Last 7 Days</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-muted ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="inline-flex items-center bg-surface-card rounded-lg px-3 py-2 text-ink font-body text-[13px] gap-1">
                    <span className="text-muted font-normal">Cohort:</span>
                    <span className="font-semibold">Spring 2026</span>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 bg-secondary-container hover:bg-surface-cream-strong text-ink px-4 py-2 rounded-lg font-body text-[13px] font-medium transition-colors shadow-sm"
                  >
                    <DownloadSimple className="size-4" />
                    <span>Export Synthesis</span>
                  </button>
                </div>
              </div>

              {/* 4 KPI tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-hairline/30">
                <div className="flex flex-col p-3 rounded-lg bg-surface-card">
                  <span className="text-[11px] font-semibold font-body uppercase tracking-wider text-muted">
                    Class Avg Comprehension
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-[26px] font-display text-ink leading-tight">
                      {avgAccuracy === null ? "—" : `${avgAccuracy}%`}
                    </span>
                    {avgAccuracy !== null && avgAccuracy >= 70 && (
                      <span className="text-[11px] font-semibold font-body text-success-text flex items-center">
                        <ArrowUp className="size-3" />
                        Good
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted font-body mt-0.5">
                    Across {withData.length} lectures with data
                  </span>
                </div>

                <div
                  className={cn(
                    "flex flex-col p-3 rounded-lg",
                    criticalCount > 0 ? "bg-error-container" : "bg-surface-card",
                  )}
                >
                  <span
                    className={cn(
                      "text-[11px] font-semibold font-body uppercase tracking-wider",
                      criticalCount > 0 ? "text-on-error-container" : "text-muted",
                    )}
                  >
                    Critical Bottlenecks
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={cn(
                        "text-[26px] font-display leading-tight",
                        criticalCount > 0 ? "text-error" : "text-ink",
                      )}
                    >
                      {criticalCount === 0 ? "None" : `${criticalCount} Lecture${criticalCount !== 1 ? "s" : ""}`}
                    </span>
                    {criticalCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-error text-on-primary font-body text-[10px] font-semibold">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted font-body mt-0.5">
                    &lt; 50% accuracy threshold
                  </span>
                </div>

                <div className="flex flex-col p-3 rounded-lg bg-surface-card">
                  <span className="text-[11px] font-semibold font-body uppercase tracking-wider text-muted">
                    Quizzes Submitted
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-[26px] font-display text-ink leading-tight">
                      {totalAttempts}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted font-body mt-0.5">
                    Total across all lectures
                  </span>
                </div>

                <div className="flex flex-col p-3 rounded-lg bg-surface-card">
                  <span className="text-[11px] font-semibold font-body uppercase tracking-wider text-muted">
                    Engaged Students
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-[26px] font-display text-ink leading-tight">
                      {totalEngaged}
                    </span>
                    <span className="text-[11px] text-muted font-body">total</span>
                  </div>
                  <span className="text-[11px] text-muted font-body mt-0.5">
                    {openQuestions} open questions
                  </span>
                </div>
              </div>
            </div>
          </section>

          {error ? (
            <p className="mx-6 mb-4 text-[14px] text-error font-body">{error}</p>
          ) : null}

          {/* Heatmap + Inspector dual-zone */}
          <section className="w-full px-6 pb-6">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Slide Struggle Heatmap */}
              <div className="xl:col-span-7 bg-surface-lowest rounded-xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-hairline/30">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[20px] font-display text-ink">Lecture Struggle Heatmap</h2>
                      <span className="px-2 py-0.5 rounded-full bg-surface-card font-mono text-[12px] text-muted">
                        {(lectures ?? []).length} Lectures
                      </span>
                    </div>
                    <p className="text-[13px] text-muted font-body mt-0.5">
                      Aggregated quiz pass rates and student engagement per lecture
                    </p>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-body text-muted">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-success" />
                      <span>&gt;75% Good</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-fill" />
                      <span>50–75% Moderate</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-error" />
                      <span>&lt;50% Critical</span>
                    </div>
                  </div>
                </div>

                {lectures === null ? (
                  <p className="text-[13px] text-muted font-body mt-4">Loading…</p>
                ) : (
                  <SlideHeatmap
                    lectures={lectures}
                    selectedId={selectedLectureId}
                    onSelect={(id: string) =>
                      setSelectedLectureId((prev) => (prev === id ? null : id))
                    }
                  />
                )}

                {/* Insight bar */}
                {lectures !== null && lectures.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-surface-card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-accent-text shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span className="text-[13px] text-body font-body">
                        {criticalCount > 0 ? (
                          <>
                            High friction on{" "}
                            <strong>
                              {(lectures ?? [])
                                .filter((l) => l.cellState === "red")
                                .map((l) => l.title)
                                .slice(0, 2)
                                .join(", ")}
                            </strong>
                          </>
                        ) : (
                          "No critical bottlenecks detected in current cohort."
                        )}
                      </span>
                    </div>
                    <span className="text-[12px] font-mono text-muted shrink-0">
                      Click any lecture to inspect
                    </span>
                  </div>
                )}
              </div>

              {/* Inspector panel */}
              <div className="xl:col-span-5">
                {selectedLecture ? (
                  <SlideInspector lecture={selectedLecture} />
                ) : (
                  <div className="bg-surface-lowest rounded-xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[280px] text-center">
                    <div className="w-12 h-12 rounded-full bg-surface-card flex items-center justify-center mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="size-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-[14px] font-medium font-body text-ink">Select a lecture</p>
                    <p className="text-[13px] text-muted font-body mt-1">
                      Click any cell in the heatmap or a row in the table to inspect diagnostic data.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Per-lecture table */}
          <section className="w-full px-6 pb-10">
            <div className="max-w-[1400px] mx-auto">
              <h2 className="text-[24px] font-display text-ink mb-4">Quiz performance by lecture</h2>
              <div className="overflow-x-auto rounded-xl border border-hairline bg-surface-lowest shadow-sm">
                <table className="w-full border-collapse text-[13px] font-body">
                  <thead>
                    <tr className="border-b border-hairline">
                      <th className="px-4 py-3 text-left text-muted font-semibold">Lecture</th>
                      <th className="px-4 py-3 text-right text-muted font-semibold">Attempts</th>
                      <th className="px-4 py-3 text-right text-muted font-semibold">Engaged</th>
                      <th className="px-4 py-3 text-right text-muted font-semibold">Avg Accuracy</th>
                      <th className="px-4 py-3 text-right text-muted font-semibold">FAQs</th>
                      <th className="px-4 py-3 text-right text-muted font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lectures === null ? (
                      <tr>
                        <td className="px-4 py-3 text-muted font-body" colSpan={6}>
                          Loading…
                        </td>
                      </tr>
                    ) : lectures.length === 0 ? (
                      <tr>
                        <td className="px-4 py-3 text-muted font-body" colSpan={6}>
                          No published lectures yet.
                        </td>
                      </tr>
                    ) : (
                      visibleLectures.map((l) => (
                        <tr
                          key={l.lectureId}
                          className={cn(
                            "border-b border-hairline/50 last:border-0 cursor-pointer transition-colors",
                            l.lectureId === selectedLectureId
                              ? "bg-surface-card"
                              : "hover:bg-surface-soft",
                          )}
                          onClick={() =>
                            setSelectedLectureId((prev) =>
                              prev === l.lectureId ? null : l.lectureId,
                            )
                          }
                        >
                          <td className="px-4 py-2.5 text-ink font-medium">{l.title}</td>
                          <td className="px-4 py-2.5 text-right text-body">{l.attemptCount}</td>
                          <td className="px-4 py-2.5 text-right text-body">
                            {l.engagedStudentCount}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-2.5 text-right font-semibold",
                              accuracyRowColor(l),
                            )}
                          >
                            {l.insufficient || l.attemptCount === 0
                              ? "—"
                              : `${Math.round((1 - l.wrongRate) * 100)}%`}
                          </td>
                          <td className="px-4 py-2.5 text-right text-body">{l.faqCount}</td>
                          <td className="px-4 py-2.5 text-right">
                            {l.cellState === "red" && (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-semibold font-body uppercase tracking-wide">
                                Critical
                              </span>
                            )}
                            {l.cellState === "amber" && (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-amber-fill/20 text-warning-text text-[10px] font-semibold font-body uppercase tracking-wide">
                                Monitor
                              </span>
                            )}
                            {l.cellState === "green" && (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-success/10 text-success-text text-[10px] font-semibold font-body uppercase tracking-wide">
                                On Track
                              </span>
                            )}
                            {l.cellState === "noData" && (
                              <span className="text-[12px] text-muted font-body">No data</span>
                            )}
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
                  {showAllLectures
                    ? "Show fewer"
                    : `Show all ${(lectures ?? []).length} lectures`}
                </button>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
