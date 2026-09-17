"use client";

import * as React from "react";
import { CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { ComposeQuestionDialog } from "./compose-question-dialog";
import type { FaqThread } from "@/lib/data/types";

function ThreadCard({ thread }: { thread: FaqThread }) {
  const [upvoted, setUpvoted] = React.useState(false);
  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-3.5">
      <p className="text-[14px] font-medium font-body leading-snug text-ink">{thread.title}</p>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar name={thread.author} size="sm" />
          <span className="text-[12px] text-muted font-body">
            {thread.author} · {thread.timeAgo}
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
          {thread.upvotes + (upvoted ? 1 : 0)}
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

export function FaqTab({ threads, slideNumber, lectureNumber }: { threads: FaqThread[]; slideNumber: number; lectureNumber: number }) {
  const onSlide = threads.filter((t) => t.scope === "slide" && t.slideNumber === slideNumber);
  const aboutLecture = threads.filter((t) => !(t.scope === "slide" && t.slideNumber === slideNumber));
  const lectureCollapsedByDefault = onSlide.length >= 3;
  const [lectureOpen, setLectureOpen] = React.useState(!lectureCollapsedByDefault);

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-4">
      <ComposeQuestionDialog slideNumber={slideNumber} lectureNumber={lectureNumber} />

      <section className="mt-4">
        <div className="flex items-baseline justify-between">
          <h4 className="text-[13px] font-medium font-body uppercase tracking-[0.5px] text-muted">
            Questions on this slide
          </h4>
          <span className="text-[12px] text-muted font-body">{onSlide.length}</span>
        </div>
        {onSlide.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted font-body">No questions yet on this slide · Ask one</p>
        ) : (
          <div className="mt-2 space-y-2">
            {onSlide.map((t) => (
              <ThreadCard key={t.id} thread={t} />
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
            <p className="mt-2 text-[13px] text-muted font-body">Be the first to ask</p>
          ) : (
            <div className="mt-2 space-y-2">
              {aboutLecture.map((t) => (
                <ThreadCard key={t.id} thread={t} />
              ))}
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}
