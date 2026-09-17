import { AppNav } from "@/components/nav/app-nav";
import { MasteryGrid } from "./mastery-grid";
import { mastery, myWidgets, myQuestions } from "@/lib/data/progress";

const WIDGET_STATUS_LABEL: Record<(typeof myWidgets)[number]["status"], string> = {
  collecting: "Collecting upvotes",
  "in-review": "In teacher review",
  "changes-requested": "Changes requested",
  merged: "Merged into lesson",
  archived: "Archived",
};

export function StudentProgress({ courseId }: { courseId: string }) {
  const lecturesCompleted = mastery.filter((m) => m.attempts >= 3 && m.correct / m.attempts >= 0.75).length;
  const quizzesTaken = mastery.reduce((sum, m) => sum + m.attempts, 0);
  const totalCorrect = mastery.reduce((sum, m) => sum + m.correct, 0);
  const avgScore = quizzesTaken > 0 ? Math.round((totalCorrect / quizzesTaken) * 100) : null;

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

        <section className="mt-10">
          <MasteryGrid cells={mastery} />
        </section>

        <section className="mt-10">
          <h2 className="text-[24px]">My widgets</h2>
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
        </section>

        <section className="mt-10">
          <h2 className="text-[24px]">My questions</h2>
          {myQuestions.length === 0 ? (
            <p className="mt-2 text-[14px] text-muted font-body">You haven&rsquo;t asked any questions yet.</p>
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
        </section>
      </main>
    </div>
  );
}
