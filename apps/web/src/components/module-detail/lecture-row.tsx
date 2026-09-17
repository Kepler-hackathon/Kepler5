"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { ProgressRing } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import type { ApiLecture } from "./types";

export function LectureRow({ lecture, role = "student" }: { lecture: ApiLecture; role?: "student" | "teacher" }) {
  const router = useRouter();
  const toast = useToast();
  const hasContent = lecture.parseStatus === "parsed";
  const done = !!lecture.progress?.completedAt;
  const inProgress = !done && (lecture.progress?.maxSlideIndex ?? 0) > 0;

  const status = done
    ? { kind: "done" as const, label: "Completed" }
    : inProgress
      ? { kind: "in-progress" as const, label: "In progress" }
      : { kind: "not-started" as const, label: lecture.parseStatus === "failed" ? "Parse failed" : "Not started" };

  const cta = done ? "Review" : inProgress ? "Resume" : "Start Lecture";
  const href = `/lecture/${lecture.id}${lecture.progress?.maxSlideIndex ? `?slide=${lecture.progress.maxSlideIndex}` : ""}`;

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
            {lecture.orderIndex}. {lecture.title}
          </p>
          <p className="text-[12px] text-muted font-body">
            {status.label}
            {lecture.slideCount ? ` · ${lecture.slideCount} slides` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {role === "teacher" && hasContent ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/lecture/${lecture.id}?mode=present`)}
          >
            Present
          </Button>
        ) : null}
        {hasContent ? (
          <Button asChild variant={inProgress ? "primary" : "secondary"} size="sm">
            <Link href={href}>{cta}</Link>
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast.push({ message: `This lecture isn't parsed yet (${lecture.parseStatus}).` })}
          >
            {cta}
          </Button>
        )}
      </div>
    </div>
  );
}
