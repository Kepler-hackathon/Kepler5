import Link from "next/link";
import { Books } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { ProgressRing } from "@/components/ui/progress";
import type { Module } from "@/lib/data/course-landing";

function statusFor(m: Module) {
  if (m.completedLectures === m.totalLectures) return { kind: "done" as const, label: "Completed" };
  if (m.completedLectures === 0 && !m.inProgressLectureNumber) return { kind: "not-started" as const, label: "Not started" };
  const percent = Math.round(((m.completedLectures + (m.inProgressLectureNumber ? 0.5 : 0)) / m.totalLectures) * 100);
  return { kind: "in-progress" as const, label: `In progress`, percent };
}

export function ModuleCard({ module: m, courseId, role = "student" }: { module: Module; courseId: string; role?: "student" | "teacher" }) {
  const status = statusFor(m);

  const teacherState =
    m.completedLectures === m.totalLectures
      ? "Published"
      : m.completedLectures > 0 || m.inProgressLectureNumber
        ? "Ready to review"
        : "Draft";

  return (
    <Card className="flex flex-col p-6">
      {/* Missing thumbnail → cream placeholder with the module number, never a broken image (frontend plan S1 edges). */}
      <div className="mb-4 flex h-28 items-center justify-center rounded-[var(--radius-control)] bg-surface-soft">
        <span className="font-display text-[40px] text-hairline">{String(m.number).padStart(2, "0")}</span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-[20px] leading-snug" title={m.title}>
          Module {m.number}: {m.title}
        </h3>
        {status.kind === "in-progress" ? (
          <ProgressRing value={status.percent} size={32} />
        ) : (
          <StatusIndicator kind={status.kind} label={status.label} className="shrink-0" />
        )}
      </div>

      <p className="mt-1 text-[13px] text-muted font-body">
        {m.totalLectures} {m.totalLectures === 1 ? "lecture" : "lectures"}
      </p>

      {m.interactiveWidgetCount > 0 ? (
        <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-hairline bg-canvas px-2.5 py-1 text-[12px] text-muted font-body">
          <Books className="size-3.5" />
          {m.interactiveWidgetCount} interactive {m.interactiveWidgetCount === 1 ? "widget" : "widgets"} available
        </span>
      ) : null}

      {role === "teacher" ? (
        <div className="mt-5 flex items-center justify-between gap-2">
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[12px] font-medium font-body",
              teacherState === "Published" && "border-success/30 bg-success/10 text-success",
              teacherState === "Ready to review" && "border-[#bb5a3a]/30 bg-[#bb5a3a]/10 text-[#bb5a3a]",
              teacherState === "Draft" && "border-hairline bg-canvas text-muted"
            )}
          >
            {teacherState}
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/course/${courseId}/module/${m.id}`}>Review</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-5">
          <Button asChild variant="primary" className="w-full">
            <Link href={`/course/${courseId}/module/${m.id}`}>Open Module</Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
