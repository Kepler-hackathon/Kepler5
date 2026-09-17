import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { StatusGlyph } from "@/components/ui/status-indicator";
import type { Module } from "@/lib/data/course-landing";

function statusFor(m: Module): { kind: "done" | "in-progress" | "not-started"; label: string } {
  if (m.completedLectures === m.totalLectures) return { kind: "done", label: "Completed" };
  if (m.completedLectures === 0 && !m.inProgressLectureNumber) return { kind: "not-started", label: "Not started" };
  return { kind: "in-progress", label: "In progress" };
}

/**
 * Sequential flowchart — the order modules were sequenced in, one box per module,
 * connected by plain arrows (frontend plan / screens_breakdown Screen 1 Flow View).
 * Same lightweight component Screen 3 reuses for its lecture flow.
 */
export function FlowView({ modules, courseId }: { modules: Module[]; courseId: string }) {
  return (
    <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
      {modules.map((m, i) => {
        const status = statusFor(m);
        return (
          <div key={m.id} className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center lg:gap-3">
            <Link href={`/course/${courseId}/module/${m.id}`}>
              <div
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--radius-control)] border bg-surface-card px-4 py-3 text-left transition-colors lg:w-56",
                  "border-hairline hover:border-body focus-visible:border-body"
                )}
              >
                <StatusGlyph kind={status.kind} label={status.label} />
                <span className="line-clamp-2 text-[14px] font-medium font-body text-ink">
                  {m.number}. {m.title}
                </span>
              </div>
            </Link>
            {i < modules.length - 1 ? (
              <CaretRight className="mx-auto size-4 rotate-90 text-hairline lg:mx-0 lg:rotate-0" aria-hidden />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
