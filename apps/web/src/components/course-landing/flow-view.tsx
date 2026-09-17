import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { StatusGlyph } from "@/components/ui/status-indicator";
import type { ApiModule } from "./types";

function statusFor(m: ApiModule): { kind: "done" | "in-progress" | "not-started"; label: string } {
  if (m.status === "published") return { kind: "done", label: "Published" };
  if (m.status === "draft") return { kind: "not-started", label: "Draft" };
  return { kind: "in-progress", label: m.status.replace("_", " ") };
}

/**
 * Sequential flowchart — the order modules were sequenced in, one box per module,
 * connected by plain arrows (frontend plan / screens_breakdown Screen 1 Flow View).
 */
export function FlowView({ modules, courseId }: { modules: ApiModule[]; courseId: string }) {
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
                <span className="line-clamp-2 text-[14px] font-medium font-body text-ink">{m.name}</span>
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
