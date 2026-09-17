"use client";

import * as React from "react";
import { Warning, ChatCircle, MagnifyingGlass } from "@phosphor-icons/react";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import type { LectureAnalytics } from "./analytics";

export function SlideInspector({ lecture }: { lecture: LectureAnalytics | null }) {
  if (!lecture) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-soft">
          <MagnifyingGlass className="size-5 text-muted" />
        </div>
        <p className="text-[14px] text-muted font-body max-w-[18rem]">
          Click any lecture in the heatmap to inspect its diagnostic details.
        </p>
      </div>
    );
  }

  const accuracy =
    !lecture.insufficient && lecture.attemptCount > 0
      ? Math.round((1 - lecture.wrongRate) * 100)
      : null;
  const isBottleneck = lecture.cellState === "red";
  const isModerate = lecture.cellState === "amber";

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {isBottleneck && (
            <span className="inline-flex items-center gap-1 rounded-full bg-error px-2.5 py-0.5 text-[10px] font-semibold font-body uppercase tracking-wider text-on-primary">
              <Warning className="size-3" weight="fill" />
              Critical
            </span>
          )}
          {isModerate && (
            <span className="rounded-full bg-amber-fill/20 px-2.5 py-0.5 text-[10px] font-semibold font-body uppercase tracking-wider text-warning-text">
              Moderate
            </span>
          )}
          {lecture.cellState === "noData" && (
            <span className="rounded-full bg-surface-soft px-2.5 py-0.5 text-[10px] font-semibold font-body uppercase tracking-wider text-muted">
              No Data Yet
            </span>
          )}
        </div>
        <h3 className="text-[22px] font-display text-ink leading-tight">{lecture.title}</h3>
      </div>

      {accuracy !== null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[13px] font-body">
            <span className="text-muted">Class accuracy</span>
            <span
              className={cn(
                "font-semibold",
                accuracy >= 85 ? "text-success-text" : accuracy >= 70 ? "text-warning-text" : "text-error"
              )}
            >
              {accuracy}%
            </span>
          </div>
          <ProgressBar value={accuracy} label={`${lecture.title} accuracy`} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-control)] bg-surface-soft p-3">
          <p className="text-[11px] font-semibold font-body uppercase tracking-[0.5px] text-muted">
            Quiz Attempts
          </p>
          <p className="mt-1 text-[22px] font-display text-ink">{lecture.attemptCount}</p>
        </div>
        <div className="rounded-[var(--radius-control)] bg-surface-soft p-3">
          <p className="text-[11px] font-semibold font-body uppercase tracking-[0.5px] text-muted">
            Students Engaged
          </p>
          <p className="mt-1 text-[22px] font-display text-ink">{lecture.engagedStudentCount}</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-[var(--radius-control)] border border-hairline bg-surface-soft px-4 py-3">
        <ChatCircle className="mt-0.5 size-4 shrink-0 text-muted" />
        <div>
          <span className="text-[13px] font-medium font-body text-ink">
            {lecture.faqCount} open question{lecture.faqCount !== 1 ? "s" : ""}
          </span>
          <p className="text-[12px] text-muted font-body">
            student micro-inquiries on this lecture
          </p>
        </div>
      </div>

      {isBottleneck && (
        <div className="rounded-[var(--radius-control)] border border-error/30 bg-error/[0.08] px-4 py-3">
          <p className="mb-1.5 text-[11px] font-semibold font-body uppercase tracking-[0.5px] text-error">
            Suggested Intervention
          </p>
          <p className="text-[13px] text-body font-body">
            Consider assigning a remediation widget or hosting a targeted office hour. Multiple
            students triggered the AI explanation drawer on this lecture.
          </p>
        </div>
      )}
    </div>
  );
}
