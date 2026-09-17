"use client";

import * as React from "react";
import { Warning } from "@phosphor-icons/react";
import { AppNav } from "@/components/nav/app-nav";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import { classStats, moduleStats, lectureStats } from "@/lib/data/analytics";

const VB_W = 500;
const ROW_H = 28;
const BAR_H = 16;
const LABEL_W = 32;
const PCT_W = 44;
const BAR_AREA_W = VB_W - LABEL_W - PCT_W;
const THRESHOLD_X = LABEL_W + BAR_AREA_W * 0.75;

function completionColor(pct: number): string {
  if (pct >= 75) return "#bb5a3a";
  if (pct >= 25) return "#e09a7f";
  return "#c8c3b8";
}

function ModuleCompletionChart() {
  const [tableOpen, setTableOpen] = React.useState(false);
  const svgH = moduleStats.length * ROW_H;

  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-5">
      <svg width="100%" viewBox={`0 0 ${VB_W} ${svgH}`} aria-label="Module completion bar chart" role="img">
        <line x1={THRESHOLD_X} y1={0} x2={THRESHOLD_X} y2={svgH} stroke="#c8c3b8" strokeWidth={1} strokeDasharray="4 4" />
        {moduleStats.map((m, i) => {
          const pct = m.totalEnrolled > 0 ? Math.round((m.studentsCompleted / m.totalEnrolled) * 100) : 0;
          const barW = BAR_AREA_W * (pct / 100);
          const rowY = i * ROW_H;
          const barY = rowY + (ROW_H - BAR_H) / 2;
          return (
            <g key={m.moduleNumber}>
              <text x={LABEL_W - 4} y={rowY + ROW_H / 2 + 4} textAnchor="end" fontSize={10} fill="#8a8278" fontFamily="Inter, sans-serif">
                M{m.moduleNumber}
              </text>
              <rect x={LABEL_W} y={barY} width={Math.max(barW, 1)} height={BAR_H} rx={3} fill={completionColor(pct)} opacity={pct === 0 ? 0.35 : 1} />
              <text x={LABEL_W + BAR_AREA_W + 6} y={rowY + ROW_H / 2 + 4} fontSize={10} fill={pct > 0 ? "#3d3730" : "#b0a89e"} fontFamily="Inter, sans-serif">
                {pct}%
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-1 flex items-center gap-3">
        <span className="text-[11px] text-muted font-body">Dashed line = 75% completion target</span>
        <button
          onClick={() => setTableOpen((v) => !v)}
          className="ml-auto text-[12px] font-body text-accent-text underline-offset-2 hover:underline"
          aria-expanded={tableOpen}
        >
          {tableOpen ? "Hide data table" : "Show data table"}
        </button>
      </div>

      {tableOpen ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-[13px] font-body">
            <thead>
              <tr className="border-b border-hairline">
                <th className="py-1.5 pr-4 text-left text-muted font-medium">Module</th>
                <th className="py-1.5 pr-4 text-right text-muted font-medium">Started</th>
                <th className="py-1.5 pr-4 text-right text-muted font-medium">Completed</th>
                <th className="py-1.5 text-right text-muted font-medium">Completion</th>
              </tr>
            </thead>
            <tbody>
              {moduleStats.map((m) => {
                const pct = m.totalEnrolled > 0 ? Math.round((m.studentsCompleted / m.totalEnrolled) * 100) : 0;
                return (
                  <tr key={m.moduleNumber} className="border-b border-hairline/50">
                    <td className="py-1.5 pr-4 text-ink">M{m.moduleNumber}: {m.moduleTitle}</td>
                    <td className="py-1.5 pr-4 text-right text-body">{m.studentsStarted}</td>
                    <td className="py-1.5 pr-4 text-right text-body">{m.studentsCompleted}</td>
                    <td className="py-1.5 text-right text-body">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export function Analytics({ courseId }: { courseId: string }) {
  const [showAllLectures, setShowAllLectures] = React.useState(false);

  const struggling = lectureStats
    .filter((l) => l.avgAccuracy !== null && l.avgAccuracy < 60)
    .sort((a, b) => (a.avgAccuracy ?? 0) - (b.avgAccuracy ?? 0));

  const visibleLectures = showAllLectures ? lectureStats : lectureStats.slice(0, 8);

  function accuracyRowColor(acc: number | null) {
    if (acc === null) return "text-muted";
    if (acc >= 75) return "text-success-text";
    if (acc >= 50) return "text-warning-text";
    return "text-error";
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav courseId={courseId} activeHref={`/course/${courseId}/analytics`} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-[13px] font-medium font-body uppercase tracking-[1px] text-accent-text">Teacher view</p>
        <h1 className="mt-1">Class Analytics</h1>

        {/* Stat tiles */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-5">
            <p className="text-[13px] text-muted font-body">Enrolled</p>
            <p className="mt-1 text-[28px] font-display text-ink">{classStats.enrolled}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-5">
            <p className="text-[13px] text-muted font-body">Active this week</p>
            <p className="mt-1 text-[28px] font-display text-ink">{classStats.activeThisWeek}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-5">
            <p className="text-[13px] text-muted font-body">Avg quiz score</p>
            <p className="mt-1 text-[28px] font-display text-ink">{classStats.avgQuizScore}%</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-5">
            <p className="text-[13px] text-muted font-body">Open questions</p>
            <p className="mt-1 text-[28px] font-display text-ink">{classStats.openQuestions}</p>
          </div>
        </div>

        {/* Module completion chart */}
        <section className="mt-10">
          <h2 className="text-[24px]">Module completion</h2>
          <div className="mt-4">
            <ModuleCompletionChart />
          </div>
        </section>

        {/* Struggling topics */}
        <section className="mt-10">
          <h2 className="text-[24px]">Topics needing attention</h2>
          <div className="mt-4">
            {struggling.length === 0 ? (
              <p className="text-[14px] text-muted font-body">All topics on track · class average above 60%.</p>
            ) : (
              <div className="space-y-3">
                {struggling.map((l) => (
                  <div key={l.lectureNumber} className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Warning className="size-4 shrink-0 text-error" weight="fill" />
                        <span className="text-[14px] font-medium font-body text-ink">
                          Lecture {l.lectureNumber}: {l.lectureTitle}
                        </span>
                      </div>
                      <span className="shrink-0 text-[13px] font-medium font-body text-error">
                        Class avg: {l.avgAccuracy}%
                      </span>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={l.avgAccuracy ?? 0} label={`Lecture ${l.lectureNumber} accuracy`} />
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
                  <th className="px-4 py-3 text-right text-muted font-medium">Avg Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {visibleLectures.map((l) => (
                  <tr key={l.lectureNumber} className="border-b border-hairline/50 last:border-0">
                    <td className="px-4 py-2.5 text-ink">
                      L{l.lectureNumber}: {l.lectureTitle}
                    </td>
                    <td className="px-4 py-2.5 text-right text-body">{l.totalAttempts}</td>
                    <td className={cn("px-4 py-2.5 text-right font-medium", accuracyRowColor(l.avgAccuracy))}>
                      {l.avgAccuracy === null ? "—" : `${l.avgAccuracy}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lectureStats.length > 8 ? (
            <button
              onClick={() => setShowAllLectures((v) => !v)}
              className="mt-3 text-[13px] font-medium font-body text-accent-text hover:underline underline-offset-2"
            >
              {showAllLectures ? "Show fewer" : `Show all ${lectureStats.length} lectures`}
            </button>
          ) : null}
        </section>
      </main>
    </div>
  );
}
