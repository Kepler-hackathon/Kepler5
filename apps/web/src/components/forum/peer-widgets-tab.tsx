"use client";

import * as React from "react";
import { CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WidgetSlot } from "@/components/widgets/widget-slot";
import { peerWidgets, PEER_WIDGET_STATUS_LABEL, type PeerWidgetStatus } from "@/lib/data/peer-widgets";

type Filter = "all" | PeerWidgetStatus;

const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["collecting", "Collecting upvotes"],
  ["in-review", "In teacher review"],
  ["merged", "Merged"],
  ["archived", "Archived"],
];

export function PeerWidgetsTab() {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [upvoted, setUpvoted] = React.useState<Set<string>>(new Set());

  const filtered = peerWidgets.filter((w) => filter === "all" || w.status === filter);

  function toggleUpvote(id: string) {
    setUpvoted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[13px] font-medium font-body transition-colors",
              filter === value ? "bg-surface-card text-ink" : "text-muted hover:text-ink"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map((w) => {
          const canUpvote = !w.isMine && w.status !== "archived";
          const count = w.upvotes + (upvoted.has(w.id) ? 1 : 0);
          return (
            <Dialog key={w.id}>
              <div
                className={cn(
                  "flex flex-col rounded-[var(--radius-card)] border border-hairline bg-surface-card p-4",
                  w.status === "archived" && "opacity-60 grayscale"
                )}
              >
                <DialogTrigger asChild>
                  <button className="text-left">
                    <p className="text-[15px] font-medium font-body text-ink">{w.title}</p>
                    <p className="mt-1 text-[12px] text-muted font-body">
                      {w.creator} · Lecture {w.sourceLecture}
                    </p>
                  </button>
                </DialogTrigger>
                <div className="mt-3 flex items-center justify-between">
                  <span className="rounded-full border border-hairline bg-canvas px-2.5 py-0.5 text-[12px] text-ink font-body">
                    {PEER_WIDGET_STATUS_LABEL[w.status]}
                    {w.status === "collecting" ? ` · ${count}/${w.threshold}` : ""}
                  </span>
                  <button
                    onClick={() => canUpvote && toggleUpvote(w.id)}
                    disabled={!canUpvote}
                    title={w.isMine ? "You can't upvote your own widget" : undefined}
                    aria-pressed={upvoted.has(w.id)}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2 py-1 text-[12px] font-medium font-body disabled:cursor-not-allowed disabled:opacity-50",
                      upvoted.has(w.id) ? "border-accent-text/50 bg-canvas text-accent-text" : "border-hairline text-muted"
                    )}
                  >
                    <CaretUp className="size-3.5" />
                    {count}
                  </button>
                </div>
                {w.status === "archived" && w.archivedReason ? (
                  <p className="mt-2 text-[12px] text-muted font-body">{w.archivedReason}</p>
                ) : null}
              </div>
              <DialogContent title={w.title} className="max-w-lg">
                <WidgetSlot typeBadge={w.typeBadge} title={w.title} explanation={w.explanation} citation={`Grounded in Lecture ${w.sourceLecture}`} />
                <div className="mt-4 flex justify-end">
                  <Button variant="secondary" disabled={!canUpvote} onClick={() => canUpvote && toggleUpvote(w.id)}>
                    <CaretUp className="size-4" /> Upvote ({count})
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          );
        })}
      </div>
    </div>
  );
}
