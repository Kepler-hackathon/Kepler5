"use client";

import * as React from "react";
import { CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { ComposeQuestionDialog } from "./compose-question-dialog";
import { apiJson } from "@/lib/api-client";
import { useIdentity } from "@/lib/identity";
import { displayNameFor } from "@/lib/display-name";
import { timeAgo } from "@/lib/time-ago";

interface ApiFaqThread {
  id: string;
  authorId: string;
  title: string;
  endorsed: boolean;
  replyCount: number;
  upvoteCount: number;
  tagSlideId: string | null;
  createdAt: string;
}

function ThreadCard({ thread, currentUserId }: { thread: ApiFaqThread; currentUserId?: string | null }) {
  const [upvoted, setUpvoted] = React.useState(false);
  const author = displayNameFor(thread.authorId, currentUserId);
  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-3.5">
      <p className="text-[14px] font-medium font-body leading-snug text-ink">{thread.title}</p>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar name={author} size="sm" />
          <span className="text-[12px] text-muted font-body">
            {author} · {timeAgo(thread.createdAt)}
          </span>
        </div>
        <button
          type="button"
          aria-pressed={upvoted}
          onClick={() => setUpvoted((v) => !v)}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-medium font-body transition-colors",
            upvoted ? "border-accent-text/50 bg-canvas text-accent-text" : "border-hairline text-muted hover:text-ink"
          )}
        >
          <CaretUp className="size-3.5" />
          {thread.upvoteCount + (upvoted ? 1 : 0)}
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {thread.endorsed ? <StatusIndicator kind="done" label="Instructor endorsed" /> : null}
        <span className="text-[12px] text-muted font-body">
          {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
        </span>
      </div>
    </div>
  );
}

/** Real per-slide/lecture Q&A, backed by /api/faq/threads (same table the full FAQ Forum
 * reads from). Previously this tab always received an empty [] from the slide viewer and had
 * no fetch of its own, so posted questions never appeared here. */
export function FaqTab({
  moduleId,
  lectureId,
  slideId,
  slideNumber,
  lectureNumber,
}: {
  moduleId: string;
  lectureId: string;
  slideId: string | null;
  slideNumber: number;
  lectureNumber: number;
}) {
  const identity = useIdentity();
  const [threads, setThreads] = React.useState<ApiFaqThread[] | null>(null);
  const [lectureOpen, setLectureOpen] = React.useState(true);

  const load = React.useCallback(() => {
    apiJson<{ threads: ApiFaqThread[] }>(`/api/faq/threads?lectureId=${lectureId}&limit=50`)
      .then((d) => setThreads(d.threads))
      .catch(() => setThreads([]));
  }, [lectureId]);

  React.useEffect(() => {
    if (!identity) return;
    load();
  }, [identity, load]);

  const onSlide = (threads ?? []).filter((t) => slideId && t.tagSlideId === slideId);
  const aboutLecture = (threads ?? []).filter((t) => !(slideId && t.tagSlideId === slideId));

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-4">
      <ComposeQuestionDialog
        moduleId={moduleId}
        lectureId={lectureId}
        slideId={slideId}
        slideNumber={slideNumber}
        lectureNumber={lectureNumber}
        onPosted={load}
      />

      <section className="mt-4">
        <div className="flex items-baseline justify-between">
          <h4 className="text-[13px] font-medium font-body uppercase tracking-[0.5px] text-muted">
            Questions on this slide
          </h4>
          <span className="text-[12px] text-muted font-body">{onSlide.length}</span>
        </div>
        {threads === null ? (
          <p className="mt-2 text-[13px] text-muted font-body">Loading…</p>
        ) : onSlide.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted font-body">No questions yet on this slide · Ask one</p>
        ) : (
          <div className="mt-2 space-y-2">
            {onSlide.map((t) => (
              <ThreadCard key={t.id} thread={t} currentUserId={identity?.userId} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-5">
        <button
          className="flex w-full items-baseline justify-between text-left"
          onClick={() => setLectureOpen((v) => !v)}
          aria-expanded={lectureOpen}
        >
          <h4 className="text-[13px] font-medium font-body uppercase tracking-[0.5px] text-muted">
            More questions about this lecture
          </h4>
          <span className="text-[12px] text-muted font-body">{aboutLecture.length}</span>
        </button>
        {lectureOpen ? (
          aboutLecture.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted font-body">{threads === null ? "Loading…" : "Be the first to ask"}</p>
          ) : (
            <div className="mt-2 space-y-2">
              {aboutLecture.map((t) => (
                <ThreadCard key={t.id} thread={t} currentUserId={identity?.userId} />
              ))}
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}
