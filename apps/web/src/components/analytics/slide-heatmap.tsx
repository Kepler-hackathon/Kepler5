"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import type { LectureAnalytics } from "./analytics";

function dotColor(l: LectureAnalytics) {
  if (l.cellState === "noData" || l.insufficient || l.attemptCount === 0) return "bg-hairline";
  if (l.cellState === "green") return "bg-success";
  if (l.cellState === "amber") return "bg-amber-fill";
  return "bg-error";
}

export function SlideHeatmap({
  lectures,
  selectedId,
  onSelect,
}: {
  lectures: LectureAnalytics[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
      {lectures.map((l, i) => {
        const accuracy =
          !l.insufficient && l.attemptCount > 0
            ? Math.round((1 - l.wrongRate) * 100)
            : null;
        const isSelected = l.lectureId === selectedId;
        return (
          <button
            key={l.lectureId}
            type="button"
            onClick={() => onSelect(l.lectureId)}
            className={cn(
              "relative flex flex-col p-2 rounded-[var(--radius-control)] text-left transition-all",
              isSelected
                ? "ring-2 ring-accent bg-surface-cream-strong"
                : l.cellState === "red"
                  ? "bg-error/[0.08] hover:bg-error/[0.12]"
                  : l.cellState === "amber"
                    ? "bg-amber-fill/[0.08] hover:bg-amber-fill/[0.12]"
                    : "bg-surface-soft hover:bg-surface-card"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold font-code text-muted">
                #{String(i + 1).padStart(2, "0")}
              </span>
              <span className={cn("size-2 rounded-full", dotColor(l))} />
            </div>
            <span className="mt-1 text-[12px] font-medium font-body text-ink truncate leading-tight">
              {l.title}
            </span>
            <span className="text-[10px] font-code text-muted mt-0.5">
              {accuracy !== null ? `${accuracy}%` : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
