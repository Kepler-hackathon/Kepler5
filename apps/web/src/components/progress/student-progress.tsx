"use client";

import * as React from "react";
import Link from "next/link";
import { AppNav } from "@/components/nav/app-nav";
import { MasteryGrid } from "./mastery-grid";
import { mastery, myWidgets, myQuestions } from "@/lib/data/progress";
import type { MasteryCell } from "@/lib/data/progress";

class SectionErrorBoundary extends React.Component<
  { children: React.ReactNode; label: string },
  { hasError: boolean; retryCount: number }
> {
  constructor(props: { children: React.ReactNode; label: string }) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card px-5 py-4">
          <p className="text-[14px] text-muted font-body">
            {this.props.label} couldn&rsquo;t load.{" "}
            <button
              onClick={() => this.setState((s) => ({ hasError: false, retryCount: s.retryCount + 1 }))}
              className="font-medium text-accent-text hover:underline underline-offset-2"
            >
              Retry
            </button>
          </p>
        </div>
      );
    }
    return (
      <React.Fragment key={this.state.retryCount}>
        {this.props.children}
      </React.Fragment>
    );
  }
}

const WIDGET_STATUS_LABEL: Record<(typeof myWidgets)[number]["status"], string> = {
  collecting: "Collecting upvotes",
  "in-review": "In teacher review",
  "changes-requested": "Changes requested",
  merged: "Merged into lesson",
  archived: "Archived",
};

// SVG chart dimensions (viewBox units)
const VB_W = 500;
const ROW_H = 24;
const BAR_H = 14;
const LABEL_W = 32;
const PCT_W = 44;
const BAR_AREA_W = VB_W - LABEL_W - PCT_W; // 424
const THRESHOLD_X = LABEL_W + BAR_AREA_W * 0.75; // 75% line

function barColor(accuracy: number | null): string {
  if (accuracy === null) return "#c8c3b8";
  return accuracy >= 0.75 ? "#bb5a3a" : "#e09a7f";
}

function AccuracyChart({ cells }: { cells: MasteryCell[] }) {
  const [tableOpen, setTableOpen] = React.useState(false);
  const svgH = cells.length * ROW_H;

  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-5">
      <svg
        width="100%"
        viewBox={`0 0 ${VB_W} ${svgH}`}
        aria-label="Accuracy by lecture bar chart"
        role="img"
      >
        {/* 75% threshold dashed line */}
        <line
          x1={THRESHOLD_X}
          y1={0}
          x2={THRESHOLD_X}
          y2={svgH}
          stroke="#c8c3b8"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {cells.map((cell, i) => {
          const hasData = cell.attempts >= 3;
          const accuracy = hasData ? cell.correct / cell.attempts : null;
          const barW = hasData
            ? BAR_AREA_W * (cell.correct / cell.attempts)
            : BAR_AREA_W * 0.12;
          const rowY = i * ROW_H;
          const barY = rowY + (ROW_H - BAR_H) / 2;
          const pctText = accuracy !== null ? `${Math.round(accuracy * 100)}%` : "—";
          const color = barColor(accuracy);

          return (
            <g key={cell.lectureNumber}>
              {/* Label */}
              <text
                x={LABEL_W - 4}
                y={rowY + ROW_H / 2 + 4}
                textAnchor="end"
                fontSize={10}
                fill="#8a8278"
                fontFamily="Inter, sans-serif"
              >
                L{cell.lectureNumber}
              </text>

              {/* Bar */}
              <rect
                x={LABEL_W}
                y={barY}
                width={Math.max(barW, 1)}
                height={BAR_H}
                rx={3}
                fill={color}
                opacity={hasData ? 1 : 0.35}
              />

              {/* Percent label */}
              <text
                x={LABEL_W + BAR_AREA_W + 6}
                y={rowY + ROW_H / 2 + 4}
                fontSize={10}
                fill={hasData ? "#3d3730" : "#b0a89e"}
                fontFamily="Inter, sans-serif"
              >
                {pctText}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-1 flex items-center gap-3">
        <span className="text-[11px] text-muted font-body">
          Dashed line = 75% mastery threshold
        </span>
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
                <th className="py-1.5 pr-4 text-left text-muted font-medium">Lecture</th>
                <th className="py-1.5 pr-4 text-right text-muted font-medium">Attempts</th>
                <th className="py-1.5 pr-4 text-right text-muted font-medium">Correct</th>
                <th className="py-1.5 text-right text-muted font-medium">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {cells.map((cell) => {
                const acc =
                  cell.attempts >= 3
                    ? `${Math.round((cell.correct / cell.attempts) * 100)}%`
                    : cell.attempts === 0
                      ? "—"
                      : "Not enough data";
                return (
                  <tr key={cell.lectureNumber} className="border-b border-hairline/50">
                    <td className="py-1.5 pr-4 text-ink">L{cell.lectureNumber}: {cell.lectureTitle}</td>
                    <td className="py-1.5 pr-4 text-right text-body">{cell.attempts}</td>
                    <td className="py-1.5 pr-4 text-right text-body">{cell.correct}</td>
                    <td className="py-1.5 text-right text-body">{acc}</td>
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

export function StudentProgress({ courseId }: { courseId: string }) {
  const lecturesCompleted = mastery.filter((m) => m.attempts >= 3 && m.correct / m.attempts >= 0.75).length;
  const quizzesTaken = mastery.reduce((sum, m) => sum + m.attempts, 0);
  const totalCorrect = mastery.reduce((sum, m) => sum + m.correct, 0);
  const avgScore = quizzesTaken > 0 ? Math.round((totalCorrect / quizzesTaken) * 100) : null;
  const isNewStudent = quizzesTaken === 0 && lecturesCompleted === 0;

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav courseId={courseId} activeHref="/progress" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1>My progress</h1>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-5">
            <p className="text-[13px] text-muted font-body">Lectures mastered</p>
            <p className="mt-1 text-[28px] font-display text-ink">{lecturesCompleted} of 18</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-5">
            <p className="text-[13px] text-muted font-body">Practice questions answered</p>
            <p className="mt-1 text-[28px] font-display text-ink">{quizzesTaken}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-5">
            <p className="text-[13px] text-muted font-body">Average score</p>
            <p className="mt-1 text-[28px] font-display text-ink">{avgScore === null ? "—" : `${avgScore}%`}</p>
          </div>
        </div>

        {/* Accuracy chart — shown when enough data, otherwise a nudge tile */}
        <section className="mt-10">
          <h2 className="text-[24px]">Accuracy by lecture</h2>
          <SectionErrorBoundary label="Accuracy chart">
            <div className="mt-4">
              {quizzesTaken <= 2 ? (
                <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card px-5 py-4">
                  <p className="text-[14px] text-body font-body">
                    Getting started — keep quizzing to see your trend!{" "}
                    <Link href="/quizzes" className="font-medium text-accent-text hover:underline underline-offset-2">
                      Start a quiz &rarr;
                    </Link>
                  </p>
                </div>
              ) : (
                <AccuracyChart cells={mastery} />
              )}
            </div>
          </SectionErrorBoundary>
        </section>

        <section className="mt-10">
          {isNewStudent ? (
            <div className="mb-4 rounded-[var(--radius-card)] border border-hairline bg-surface-card px-5 py-4">
              <p className="text-[14px] text-body font-body">
                Complete practice quizzes to build your mastery map.{" "}
                <Link href="/quizzes" className="font-medium text-accent-text hover:underline underline-offset-2">
                  Start a quiz &rarr;
                </Link>
              </p>
            </div>
          ) : null}
          <SectionErrorBoundary label="Mastery grid">
            <MasteryGrid cells={mastery} />
          </SectionErrorBoundary>
        </section>

        <section className="mt-10">
          <h2 className="text-[24px]">My widgets</h2>
          <SectionErrorBoundary label="My widgets">
            {myWidgets.length === 0 ? (
              <p className="mt-2 text-[14px] text-muted font-body">
                Publish an explanation from the Remediation Drawer to see it here.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {myWidgets.map((w) => (
                  <div key={w.id} className="rounded-[var(--radius-control)] border border-hairline bg-surface-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[14px] font-medium font-body text-ink">{w.title}</p>
                      <span className="shrink-0 text-[12px] text-muted font-body">Lecture {w.sourceLecture}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded-full border border-hairline bg-canvas px-2.5 py-0.5 text-[12px] text-ink font-body">
                        {WIDGET_STATUS_LABEL[w.status]}
                        {w.status === "collecting" ? ` · ${w.upvotes}/${w.threshold}` : ""}
                      </span>
                    </div>
                    {w.status === "changes-requested" && w.teacherNote ? (
                      <p className="mt-2 text-[13px] leading-relaxed text-body font-body">
                        <span className="font-medium text-ink">Instructor note: </span>
                        {w.teacherNote} You can regenerate it with this feedback from the lecture it came from.
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SectionErrorBoundary>
        </section>

        <section className="mt-10">
          <h2 className="text-[24px]">My questions</h2>
          <SectionErrorBoundary label="My questions">
            {myQuestions.length === 0 ? (
              <p className="mt-2 text-[14px] text-muted font-body">
                You haven&rsquo;t asked any questions yet.{" "}
                <Link href="/course/cs201/forum" className="font-medium text-accent-text hover:underline underline-offset-2">
                  Ask in the forum &rarr;
                </Link>
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {myQuestions.map((q) => (
                  <div key={q.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-hairline bg-surface-card p-4">
                    <div>
                      <p className="text-[14px] font-medium font-body text-ink">{q.title}</p>
                      <p className="text-[12px] text-muted font-body">
                        Lecture {q.lectureNumber} · {q.replyCount} {q.replyCount === 1 ? "reply" : "replies"}
                      </p>
                    </div>
                    {q.hiddenByFilter ? (
                      <span className="shrink-0 text-[12px] text-muted font-body">Hidden by filter</span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SectionErrorBoundary>
        </section>
      </main>
    </div>
  );
}
