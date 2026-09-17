"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { ProgressRing } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import type { LectureSummary } from "@/lib/data/curriculum";

/** Lecture row status matrix (frontend plan S3): not-started/in-progress/completed, each with its own CTA. */
export function LectureRow({ lecture }: { lecture: LectureSummary }) {
  const toast = useToast();
  const notBuilt = () => toast.push({ message: "This lecture doesn't have authored content in this preview." });

  const cta =
    lecture.status === "done" ? "Review" : lecture.status === "in-progress" ? "Resume" : "Start Lecture";

  const status =
    lecture.status === "done"
      ? { kind: "done" as const, label: "Completed" }
      : lecture.status === "in-progress"
        ? { kind: "in-progress" as const, label: "In progress" }
        : { kind: "not-started" as const, label: "Not started" };

  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-control)] border border-hairline bg-surface-card px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        {status.kind === "in-progress" ? (
          <ProgressRing value={44} size={28} showLabel={false} />
        ) : (
          <StatusIndicator kind={status.kind} label={status.label} srOnlyLabel />
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium font-body text-ink">
            Lecture {lecture.number}: {lecture.title}
          </p>
          <p className="text-[12px] text-muted font-body">{status.label}</p>
        </div>
      </div>
      {lecture.hasContent ? (
        <Button asChild variant={lecture.status === "in-progress" ? "primary" : "secondary"} size="sm" className="shrink-0">
          <Link href={`/lecture/${lecture.number}${lecture.resumeSlide ? `?slide=${lecture.resumeSlide}` : ""}`}>{cta}</Link>
        </Button>
      ) : (
        <Button variant="secondary" size="sm" className="shrink-0" onClick={notBuilt}>
          {cta}
        </Button>
      )}
    </div>
  );
}
