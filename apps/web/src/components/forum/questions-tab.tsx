"use client";

import * as React from "react";
import { MagnifyingGlass, CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { ForumComposeDialog } from "./forum-compose-dialog";
import { ThreadDetailDialog } from "./thread-detail-dialog";
import { apiJson } from "@/lib/api-client";
import { useIdentity } from "@/lib/identity";
import { displayNameFor } from "@/lib/display-name";
import { timeAgo } from "@/lib/time-ago";
import type { ModuleOption } from "./forum";

export interface FaqThreadRow {
  id: string;
  authorId: string;
  title: string;
  bodyMd: string;
  tagModuleId: string;
  tagLectureId: string | null;
  tagSlideId: string | null;
  classification: "question" | "logistics" | "spam";
  endorsed: boolean;
  replyCount: number;
  upvoteCount: number;
  createdAt: string;
}

type Filter = "all" | "unanswered" | "endorsed";

export function QuestionsTab({ modules }: { modules: ModuleOption[] }) {
  const identity = useIdentity();
  const [filter, setFilter] = React.useState<Filter>("all");
  const [includeLogistics, setIncludeLogistics] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [threads, setThreads] = React.useState<FaqThreadRow[]>([]);
  const [upvoted, setUpvoted] = React.useState<Set<string>>(new Set());
  const [openThread, setOpenThread] = React.useState<FaqThreadRow | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    setLoading(true);
    apiJson<{ threads: FaqThreadRow[] }>(`/api/faq/threads?includeLogistics=true&limit=50`)
      .then((data) => {
        if (!cancelled) setThreads(data.threads);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [identity]);

  const moduleName = React.useCallback(
    (moduleId: string) => modules.find((m) => m.id === moduleId)?.name ?? "Module",
    [modules],
  );

  const filtered = threads
    .filter((t) => includeLogistics || t.classification !== "logistics")
    .filter((t) => (filter === "unanswered" ? t.replyCount === 0 : filter === "endorsed" ? t.endorsed : true))
    .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(b.endorsed) - Number(a.endorsed));

  async function toggleUpvote(id: string) {
    // Optimistic: real count comes back from the API, this just avoids double-clicks feeling dead.
    setUpvoted((prev) => new Set(prev).add(id));
    try {
      const result = await apiJson<{ upvoted: boolean; upvoteCount: number }>(`/api/faq/threads/${id}/upvote`, { method: "POST" });
      setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, upvoteCount: result.upvoteCount } : t)));
      setUpvoted((prev) => {
        const next = new Set(prev);
        if (result.upvoted) next.add(id);
        else next.delete(id);
        return next;
      });
    } catch {
      setUpvoted((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
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
        <ForumComposeDialog modules={modules} onPost={(thread) => setThreads((prev) => [thread, ...prev])} />
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
        {loading ? (
          <p className="py-8 text-center text-[14px] text-muted font-body">Loading…</p>
        ) : filtered.length === 0 ? (
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
                  <Avatar name={displayNameFor(t.authorId, identity?.userId)} size="sm" />
                  <span className="text-[12px] text-muted font-body">
                    {displayNameFor(t.authorId, identity?.userId)} · {timeAgo(t.createdAt)} · {moduleName(t.tagModuleId)}
                  </span>
                  {t.endorsed ? <StatusIndicator kind="done" label="Instructor endorsed" /> : null}
                  {t.classification === "logistics" ? (
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
                {t.upvoteCount}
              </button>
            </div>
          ))
        )}
      </div>

      <ThreadDetailDialog
        thread={openThread}
        open={openThread !== null}
        onOpenChange={(open) => !open && setOpenThread(null)}
        onReplyPosted={() => setThreads((prev) => prev.map((t) => (t.id === openThread?.id ? { ...t, replyCount: t.replyCount + 1 } : t)))}
      />
    </div>
  );
}
