"use client";

import * as React from "react";
import { Table } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Tooltip } from "@/components/ui/tooltip";
import { StatusGlyph } from "@/components/ui/status-indicator";
import type { MasteryCell } from "@/lib/data/progress";

function statusFor(cell: MasteryCell) {
  if (cell.attempts < 3) return { kind: "not-started" as const, label: "Not enough data" };
  const rate = cell.correct / cell.attempts;
  if (rate >= 0.75) return { kind: "done" as const, label: "Mastered" };
  if (rate >= 0.4) return { kind: "in-progress" as const, label: "In progress" };
  return { kind: "attention" as const, label: "Needs attention" };
}

/** Mastery heatmap-lite with a required accessible table view (frontend plan S7 edges). */
export function MasteryGrid({ cells }: { cells: MasteryCell[] }) {
  const [asTable, setAsTable] = React.useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-[24px]">Mastery by lecture</h2>
        <button
          onClick={() => setAsTable((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1 text-[12px] font-body text-muted transition-colors hover:text-ink"
        >
          <Table className="size-3.5" />
          {asTable ? "Show grid" : "Show as table"}
        </button>
      </div>

      {asTable ? (
        <table className="mt-4 w-full border-collapse text-left text-[13px] font-body">
          <thead>
            <tr className="border-b border-hairline text-muted">
              <th className="py-2 pr-4 font-medium">Lecture</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 font-medium">Attempts</th>
            </tr>
          </thead>
          <tbody>
            {cells.map((cell) => {
              const status = statusFor(cell);
              return (
                <tr key={cell.lectureNumber} className="border-b border-hairline">
                  <td className="py-2 pr-4 text-ink">
                    {cell.lectureNumber}. {cell.lectureTitle}
                  </td>
                  <td className="py-2 pr-4 text-body">{status.label}</td>
                  <td className="py-2 text-body">
                    {cell.attempts === 0 ? "—" : `${cell.correct} of ${cell.attempts} correct`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-9">
          {cells.map((cell) => {
            const status = statusFor(cell);
            return (
              <Tooltip
                key={cell.lectureNumber}
                content={
                  <span>
                    {cell.lectureTitle}
                    <br />
                    {cell.attempts === 0 ? "No attempts yet" : `${cell.correct} of ${cell.attempts} correct`}
                  </span>
                }
              >
                <button
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-[var(--radius-control)] border border-hairline text-[11px] font-medium font-body",
                    status.kind === "done" && "bg-success/15 text-success-text",
                    status.kind === "in-progress" && "bg-amber-fill/25 text-warning-text",
                    status.kind === "attention" && "bg-error/12 text-error",
                    status.kind === "not-started" && "bg-hairline/40 text-muted"
                  )}
                  aria-label={`Lecture ${cell.lectureNumber}: ${cell.lectureTitle}, ${status.label}`}
                >
                  {cell.lectureNumber}
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-muted font-body">
        <span className="flex items-center gap-1.5">
          <StatusGlyph kind="done" label="Mastered" /> Mastered
        </span>
        <span className="flex items-center gap-1.5">
          <StatusGlyph kind="in-progress" label="In progress" /> In progress
        </span>
        <span className="flex items-center gap-1.5">
          <StatusGlyph kind="attention" label="Needs attention" /> Needs attention
        </span>
        <span className="flex items-center gap-1.5">
          <StatusGlyph kind="not-started" label="Not enough data" /> Not enough data
        </span>
      </div>
    </div>
  );
}
