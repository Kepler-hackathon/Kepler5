"use client";

import * as React from "react";
import { CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WidgetSlot } from "@/components/widgets/widget-slot";
import { apiJson } from "@/lib/api-client";
import { useIdentity } from "@/lib/identity";
import { displayNameFor } from "@/lib/display-name";

type PeerStatus = "collecting" | "in_review" | "changes_requested" | "merged" | "archived";

const STATUS_LABEL: Record<PeerStatus, string> = {
  collecting: "Collecting upvotes",
  in_review: "In teacher review",
  changes_requested: "Changes requested",
  merged: "Merged",
  archived: "Archived",
};

const FILTERS: [PeerStatus | "all", string][] = [
  ["all", "All"],
  ["collecting", "Collecting upvotes"],
  ["in_review", "In teacher review"],
  ["merged", "Merged"],
  ["archived", "Archived"],
];

interface PeerWidgetRow {
  id: string;
  authorId: string;
  title: string;
  content: Record<string, unknown>;
  tagLectureId: string | null;
  status: PeerStatus;
  upvoteCount: number;
  archiveReason: string | null;
}

function widgetExplanation(content: Record<string, unknown>): string {
  if (typeof content.explanationMd === "string") return content.explanationMd;
  if (typeof content.text === "string") return content.text;
  return "No explanation available.";
}

function widgetTypeBadge(content: Record<string, unknown>): string {
  if (typeof content.kind === "string") return content.kind;
  if (typeof content.family === "string") return content.family;
  return "widget";
}

export function PeerWidgetsTab() {
  const identity = useIdentity();
  const [filter, setFilter] = React.useState<PeerStatus | "all">("all");
  const [widgets, setWidgets] = React.useState<PeerWidgetRow[]>([]);
  const [upvoted, setUpvoted] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    setLoading(true);
    apiJson<{ widgets: PeerWidgetRow[] }>("/api/peer-widgets?limit=50")
      .then((data) => {
        if (!cancelled) setWidgets(data.widgets);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [identity]);

  const filtered = widgets.filter((w) => filter === "all" || w.status === filter);

  async function toggleUpvote(id: string, isMine: boolean, status: PeerStatus) {
    if (isMine || status === "archived") return;
    try {
      const result = await apiJson<{ upvoted: boolean; upvoteCount: number; status: PeerStatus }>(
        `/api/peer-widgets/${id}/upvote`,
        { method: "POST" },
      );
      setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, upvoteCount: result.upvoteCount, status: result.status } : w)));
      setUpvoted((prev) => {
        const next = new Set(prev);
        if (result.upvoted) next.add(id);
        else next.delete(id);
        return next;
      });
    } catch {
      // no-op — e.g. self-upvote or already-archived; button stays as-is
    }
  }

  if (loading) {
    return <p className="py-8 text-center text-[14px] text-muted font-body">Loading…</p>;
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

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-muted font-body">No peer widgets yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((w) => {
            const isMine = w.authorId === identity?.userId;
            const canUpvote = !isMine && w.status !== "archived";
            const count = w.upvoteCount;
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
                      <p className="mt-1 text-[12px] text-muted font-body">{displayNameFor(w.authorId, identity?.userId)}</p>
                    </button>
                  </DialogTrigger>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="rounded-full border border-hairline bg-canvas px-2.5 py-0.5 text-[12px] text-ink font-body">
                      {STATUS_LABEL[w.status]}
                    </span>
                    <button
                      onClick={() => toggleUpvote(w.id, isMine, w.status)}
                      disabled={!canUpvote}
                      title={isMine ? "You can't upvote your own widget" : undefined}
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
                  {w.status === "archived" && w.archiveReason ? (
                    <p className="mt-2 text-[12px] text-muted font-body">{w.archiveReason}</p>
                  ) : null}
                </div>
                <DialogContent title={w.title} className="max-w-lg">
                  <WidgetSlot typeBadge={widgetTypeBadge(w.content)} title={w.title} explanation={widgetExplanation(w.content)} citation="Peer-submitted widget" />
                  <div className="mt-4 flex justify-end">
                    <Button variant="secondary" disabled={!canUpvote} onClick={() => toggleUpvote(w.id, isMine, w.status)}>
                      <CaretUp className="size-4" /> Upvote ({count})
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
      )}
    </div>
  );
}
