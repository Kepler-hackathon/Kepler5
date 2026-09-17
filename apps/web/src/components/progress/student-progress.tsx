"use client";

import * as React from "react";
import Link from "next/link";
import { AppNav } from "@/components/nav/app-nav";
import { MasteryGrid, type MasteryCell } from "./mastery-grid";
import { apiJson } from "@/lib/api-client";
import { useIdentity } from "@/lib/identity";

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
    return <React.Fragment key={this.state.retryCount}>{this.props.children}</React.Fragment>;
  }
}

interface ProgressRow {
  lectureId: string;
  maxSlideIndex: number;
  completedAt: string | null;
  lastSlideId: string | null;
  title: string;
}

interface SubmissionRow {
  question_id: string;
  is_correct: boolean;
  answered_at: string;
  prompt_md: string;
  correct_key: string;
  concept_label: string;
  lecture_id: string;
}

const WIDGET_STATUS_LABEL: Record<string, string> = {
  collecting: "Collecting upvotes",
  in_review: "In teacher review",
  changes_requested: "Changes requested",
  merged: "Merged into lesson",
  archived: "Archived",
};

interface WidgetRow {
  id: string;
  title: string;
  status: keyof typeof WIDGET_STATUS_LABEL;
  upvoteCount: number;
  teacherNote: string | null;
}

// SVG chart dimensions (viewBox units)
const VB_W = 500;
const ROW_H = 24;
const BAR_H = 14;
const LABEL_W = 100;
const PCT_W = 44;
const BAR_AREA_W = VB_W - LABEL_W - PCT_W;
const THRESHOLD_X = LABEL_W + BAR_AREA_W * 0.75;

function barColor(accuracy: number | null): string {
  if (accuracy === null) return "#c8c3b8";
  return accuracy >= 0.75 ? "#bb5a3a" : "#e09a7f";
}

function AccuracyChart({ cells }: { cells: MasteryCell[] }) {
  const [tableOpen, setTableOpen] = React.useState(false);
  const svgH = cells.length * ROW_H;

  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-5">
      <svg width="100%" viewBox={`0 0 ${VB_W} ${svgH}`} aria-label="Accuracy by lecture bar chart" role="img">
        <line x1={THRESHOLD_X} y1={0} x2={THRESHOLD_X} y2={svgH} stroke="#c8c3b8" strokeWidth={1} strokeDasharray="4 4" />
        {cells.map((cell, i) => {
          const hasData = cell.attempts >= 3;
          const accuracy = hasData ? cell.correct / cell.attempts : null;
          const barW = hasData ? BAR_AREA_W * (cell.correct / cell.attempts) : BAR_AREA_W * 0.12;
          const rowY = i * ROW_H;
          const barY = rowY + (ROW_H - BAR_H) / 2;
          const pctText = accuracy !== null ? `${Math.round(accuracy * 100)}%` : "—";
          const color = barColor(accuracy);
          return (
            <g key={cell.lectureId}>
              <text x={LABEL_W - 4} y={rowY + ROW_H / 2 + 4} textAnchor="end" fontSize={9} fill="#8a8278" fontFamily="Inter, sans-serif">
                {cell.lectureTitle.length > 18 ? `${cell.lectureTitle.slice(0, 17)}…` : cell.lectureTitle}
              </text>
              <rect x={LABEL_W} y={barY} width={Math.max(barW, 1)} height={BAR_H} rx={3} fill={color} opacity={hasData ? 1 : 0.35} />
              <text x={LABEL_W + BAR_AREA_W + 6} y={rowY + ROW_H / 2 + 4} fontSize={10} fill={hasData ? "#3d3730" : "#b0a89e"} fontFamily="Inter, sans-serif">
                {pctText}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-[11px] text-muted font-body">Dashed line = 75% mastery threshold</span>
        <button onClick={() => setTableOpen((v) => !v)} className="ml-auto text-[12px] font-body text-accent-text underline-offset-2 hover:underline" aria-expanded={tableOpen}>
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
                const acc = cell.attempts >= 3 ? `${Math.round((cell.correct / cell.attempts) * 100)}%` : cell.attempts === 0 ? "—" : "Not enough data";
                return (
                  <tr key={cell.lectureId} className="border-b border-hairline/50">
                    <td className="py-1.5 pr-4 text-ink">{cell.lectureTitle}</td>
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

export function StudentProgress() {
  const identity = useIdentity();
  const [courseId, setCourseId] = React.useState("");
  const [progress, setProgress] = React.useState<ProgressRow[] | null>(null);
  const [submissions, setSubmissions] = React.useState<SubmissionRow[] | null>(null);
  const [widgets, setWidgets] = React.useState<WidgetRow[] | null>(null);

  React.useEffect(() => {
    if (!identity) return;
    apiJson<ProgressRow[]>("/api/me/progress").then(setProgress).catch(() => setProgress([]));
    apiJson<SubmissionRow[]>("/api/me/submissions/questions").then(setSubmissions).catch(() => setSubmissions([]));
    apiJson<WidgetRow[]>("/api/me/submissions/widgets").then(setWidgets).catch(() => setWidgets([]));
    apiJson<{ courses: { id: string }[] }>("/api/courses")
      .then((r) => setCourseId(r.courses[0]?.id ?? ""))
      .catch(() => {});
  }, [identity]);

  if (!identity) {
    return <div className="min-h-screen bg-canvas p-10 text-[14px] text-muted font-body">Pick a role first.</div>;
  }

  const loading = progress === null || submissions === null || widgets === null;

  const titleByLecture = new Map((progress ?? []).map((p) => [p.lectureId, p.title]));
  const mastery: MasteryCell[] = React.useMemo(() => {
    if (!submissions) return [];
    const byLecture = new Map<string, { attempts: number; correct: number }>();
    for (const s of submissions) {
      const entry = byLecture.get(s.lecture_id) ?? { attempts: 0, correct: 0 };
      entry.attempts += 1;
      if (s.is_correct) entry.correct += 1;
      byLecture.set(s.lecture_id, entry);
    }
    return Array.from(byLecture.entries()).map(([lectureId, v]) => ({
      lectureId,
      lectureTitle: titleByLecture.get(lectureId) ?? "Untitled lecture",
      attempts: v.attempts,
      correct: v.correct,
    }));
  }, [submissions, titleByLecture]);

  const lecturesCompleted = (progress ?? []).filter((p) => p.completedAt).length;
  const quizzesTaken = submissions?.length ?? 0;
  const totalCorrect = (submissions ?? []).filter((s) => s.is_correct).length;
  const avgScore = quizzesTaken > 0 ? Math.round((totalCorrect / quizzesTaken) * 100) : null;
  const isNewStudent = quizzesTaken === 0 && lecturesCompleted === 0;

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav courseId={courseId} course={null} activeHref="/progress" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1>My progress</h1>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-5">
            <p className="text-[13px] text-muted font-body">Lectures completed</p>
            <p className="mt-1 text-[28px] font-display text-ink">{lecturesCompleted}</p>
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

        <section className="mt-10">
          <h2 className="text-[24px]">Accuracy by lecture</h2>
          <SectionErrorBoundary label="Accuracy chart">
            <div className="mt-4">
              {loading ? (
                <p className="text-[14px] text-muted font-body">Loading…</p>
              ) : quizzesTaken <= 2 ? (
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
          {!loading && isNewStudent ? (
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
            {loading ? <p className="text-[14px] text-muted font-body">Loading…</p> : <MasteryGrid cells={mastery} />}
          </SectionErrorBoundary>
        </section>

        <section className="mt-10">
          <h2 className="text-[24px]">My widgets</h2>
          <SectionErrorBoundary label="My widgets">
            {loading ? (
              <p className="mt-2 text-[14px] text-muted font-body">Loading…</p>
            ) : widgets!.length === 0 ? (
              <p className="mt-2 text-[14px] text-muted font-body">
                Publish an explanation from the Remediation Drawer to see it here.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {widgets!.map((w) => (
                  <div key={w.id} className="rounded-[var(--radius-control)] border border-hairline bg-surface-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[14px] font-medium font-body text-ink">{w.title}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded-full border border-hairline bg-canvas px-2.5 py-0.5 text-[12px] text-ink font-body">
                        {WIDGET_STATUS_LABEL[w.status] ?? w.status}
                        {w.status === "collecting" ? ` · ${w.upvoteCount} upvotes` : ""}
                      </span>
                    </div>
                    {w.status === "changes_requested" && w.teacherNote ? (
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
      </main>
    </div>
  );
}
