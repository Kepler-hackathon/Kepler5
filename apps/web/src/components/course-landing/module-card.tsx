import Link from "next/link";
import { BookOpen } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/ui/status-indicator";
import type { ApiModule } from "./types";

function statusFor(m: ApiModule) {
  if (m.status === "published") return { kind: "done" as const, label: "Published" };
  if (m.status === "ready_to_review") return { kind: "in-progress" as const, label: "Ready to review" };
  if (m.status === "needs_attention") return { kind: "in-progress" as const, label: "Needs attention" };
  if (m.status === "processing") return { kind: "in-progress" as const, label: "Processing" };
  return { kind: "not-started" as const, label: "Draft" };
}

export function ModuleCard({ module: m, courseId, role = "student" }: { module: ApiModule; courseId: string; role?: "student" | "teacher" }) {
  const status = statusFor(m);
  const isDraft = role === "teacher" && m.status === "draft";
  const href = isDraft ? `/course/${courseId}/module/${m.id}/wizard` : `/course/${courseId}/module/${m.id}`;

  return (
    <Card className="flex flex-col p-6">
      {/* Thumbnail placeholder */}
      <div className="mb-4 flex h-28 items-center justify-center rounded-[var(--radius-control)] bg-surface-dark">
        <BookOpen className="size-10 text-on-dark-soft/40" aria-hidden />
      </div>

      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-[20px] leading-snug" title={m.name}>
          {m.name}
        </h3>
        <StatusIndicator kind={status.kind} label={status.label} className="shrink-0" />
      </div>

      {/* Metadata chips */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {m.aiOptIn ? (
          <span className="rounded-full border border-accent-text/30 bg-accent-text/10 px-2 py-0.5 text-[11px] font-medium font-body text-accent-text">
            AI Content
          </span>
        ) : null}
      </div>

      {/* Progress bar (placeholder — no per-student lecture counts at this level) */}
      <div className="mt-3">
        <div className="h-1 rounded-full bg-surface-soft overflow-hidden">
          <div className="h-full rounded-full bg-button-primary" style={{ width: "0%" }} />
        </div>
      </div>

      <div className="mt-4">
        <Button asChild variant={role === "teacher" ? "ghost" : "primary"} size={role === "teacher" ? "sm" : "md"} className={role === "teacher" ? "" : "w-full"}>
          <Link href={href}>{isDraft ? "Resume Setup" : role === "teacher" ? "Review" : "Open Module"}</Link>
        </Button>
      </div>
    </Card>
  );
}
