"use client";

import * as React from "react";
import { MagnifyingGlass, CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { ForumComposeDialog } from "./forum-compose-dialog";
import { ThreadDetailDialog } from "./thread-detail-dialog";
import { forumThreads, type ForumThread } from "@/lib/data/forum";

type Filter = "all" | "unanswered" | "endorsed";

export function QuestionsTab({ onPost }: { onPost?: (title: string) => void }) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [includeLogistics, setIncludeLogistics] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [upvoted, setUpvoted] = React.useState<Set<string>>(new Set());
  const [openThread, setOpenThread] = React.useState<ForumThread | null>(null);
  const [extraThreads, setExtraThreads] = React.useState<ForumThread[]>([]);

  const filtered = [...extraThreads, ...forumThreads]
    .filter((t) => includeLogistics || !t.isLogistics)
    .filter((t) => (filter === "unanswered" ? t.replyCount === 0 : filter === "endorsed" ? t.endorsed : true))
    .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(b.endorsed) - Number(a.endorsed));

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "All"],
              ["unanswered", "Unanswered"],
              ["endorsed", "Endorsed"],
            ] as [Filter, string][]
          ).map(([value, label]) => (
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
          <label className="ml-2 flex items-center gap-1.5 text-[13px] text-muted font-body">
            <input
              type="checkbox"
              checked={includeLogistics}
              onChange={(e) => setIncludeLogistics(e.target.checked)}
              className="size-4 accent-[var(--color-button-primary)]"
            />
            Include logistics
          </label>
        </div>
        <ForumComposeDialog
          onPost={(title) => {
            setExtraThreads((prev) => [
              {
                id: `local-${Date.now()}`,
                title,
                author: "You",
                timeAgo: "just now",
                endorsed: false,
                replyCount: 0,
                upvotes: 0,
                scope: "lecture" as const,
                moduleNumber: 1,
                isLogistics: false,
                body: "",
              },
              ...prev,
            ]);
            onPost?.(title);
          }}
        />
      </div>

      <div className="relative mt-4">
        <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions…"
          className="w-full rounded-[var(--radius-control)] border border-hairline bg-canvas py-2 pl-9 pr-3 text-[14px] font-body"
        />
      </div>

      <div className="mt-4 space-y-2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-muted font-body">No matches · clear filters</p>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className="flex w-full items-start justify-between gap-3 rounded-[var(--radius-card)] border border-hairline bg-surface-card p-4 transition-colors hover:border-body"
            >
              <button onClick={() => setOpenThread(t)} className="min-w-0 flex-1 text-left">
                <p className="text-[15px] font-medium font-body text-ink">{t.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Avatar name={t.author} size="sm" />
                  <span className="text-[12px] text-muted font-body">
                    {t.author} · {t.timeAgo} · Module {t.moduleNumber}
                  </span>
                  {t.endorsed ? <StatusIndicator kind="done" label="Instructor endorsed" /> : null}
                  {t.isLogistics ? (
                    <span className="rounded-full border border-hairline px-2 py-0.5 text-[11px] text-muted font-body">Logistics</span>
                  ) : null}
                </div>
              </button>
              <button
                onClick={() => toggleUpvote(t.id)}
                aria-pressed={upvoted.has(t.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[12px] font-medium font-body",
                  upvoted.has(t.id) ? "border-accent-text/50 bg-canvas text-accent-text" : "border-hairline text-muted"
                )}
              >
                <CaretUp className="size-3.5" />
                {t.upvotes + (upvoted.has(t.id) ? 1 : 0)}
              </button>
            </div>
          ))
        )}
      </div>

      <ThreadDetailDialog thread={openThread} open={openThread !== null} onOpenChange={(open) => !open && setOpenThread(null)} />
    </div>
  );
}
