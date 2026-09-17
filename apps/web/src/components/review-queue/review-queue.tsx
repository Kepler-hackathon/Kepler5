"use client";

import * as React from "react";
import { CheckCircle, Warning, Archive, CaretDown, CaretUp } from "@phosphor-icons/react";
import { AppNav } from "@/components/nav/app-nav";
import { Tabs, TabList, TabTrigger, TabPanel } from "@/components/ui/tabs";
import { WidgetSlot } from "@/components/widgets/widget-slot";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { peerWidgets, type PeerWidget } from "@/lib/data/peer-widgets";
import { forumThreads, type ForumThread } from "@/lib/data/forum";

type ReviewStatus = "in-review" | "approved" | "changes-requested" | "archived";

function WidgetReviewCard({
  widget,
  status,
  note,
  onApprove,
  onRequestChanges,
  onArchive,
  onUndo,
}: {
  widget: PeerWidget;
  status: ReviewStatus;
  note: string;
  onApprove: () => void;
  onRequestChanges: (note: string) => void;
  onArchive: () => void;
  onUndo: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [draftNote, setDraftNote] = React.useState("");
  const [showNoteForm, setShowNoteForm] = React.useState(false);

  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-[15px] font-medium font-body text-ink">{widget.title}</p>
          <p className="mt-0.5 text-[12px] text-muted font-body">
            {widget.creator} · Lecture {widget.sourceLecture} · {widget.upvotes} upvote{widget.upvotes !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {status === "approved" && (
            <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[12px] font-medium font-body text-success">
              Approved
            </span>
          )}
          {status === "changes-requested" && (
            <span className="rounded-full border border-[#bb5a3a]/30 bg-[#bb5a3a]/10 px-2.5 py-0.5 text-[12px] font-medium font-body text-accent-text">
              Changes requested
            </span>
          )}
          {status === "archived" && (
            <span className="rounded-full border border-hairline bg-canvas px-2.5 py-0.5 text-[12px] font-body text-muted">
              Archived
            </span>
          )}
          <CaretDown className={cn("size-4 text-muted transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded ? (
        <div className="mt-4 space-y-4">
          <WidgetSlot
            typeBadge={widget.typeBadge}
            title={widget.title}
            explanation={widget.explanation}
            size="compact"
          />

          {status === "changes-requested" && note ? (
            <div className="rounded-[var(--radius-control)] border border-hairline bg-canvas px-3 py-2">
              <p className="text-[12px] font-medium font-body text-muted">Your note to the student:</p>
              <p className="mt-1 text-[13px] text-body font-body">{note}</p>
            </div>
          ) : null}

          {showNoteForm ? (
            <div className="space-y-2">
              <Textarea
                rows={3}
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="Explain what needs to change…"
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!draftNote.trim()}
                  onClick={() => {
                    onRequestChanges(draftNote.trim());
                    setShowNoteForm(false);
                    setDraftNote("");
                  }}
                >
                  Send feedback
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowNoteForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {status === "in-review" && !showNoteForm ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" onClick={onApprove}>
                <CheckCircle className="size-4" /> Approve
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowNoteForm(true)}>
                <Warning className="size-4" /> Request changes
              </Button>
              <Button variant="ghost" size="sm" onClick={onArchive}>
                <Archive className="size-4" /> Archive
              </Button>
            </div>
          ) : null}

          {(status === "approved" || status === "changes-requested" || status === "archived") ? (
            <button
              onClick={onUndo}
              className="text-[12px] font-body text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Undo
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function QuestionReviewRow({
  thread,
  endorsed,
  onEndorse,
}: {
  thread: ForumThread;
  endorsed: boolean;
  onEndorse: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[var(--radius-control)] border border-hairline bg-surface-card p-4">
      <div className="min-w-0">
        <p className="text-[14px] font-medium font-body text-ink">{thread.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Avatar name={thread.author} size="sm" />
          <span className="text-[12px] text-muted font-body">
            {thread.author} · {thread.timeAgo} · Module {thread.moduleNumber}
          </span>
          {thread.replyCount === 0 ? (
            <span className="rounded-full border border-error/30 bg-error/8 px-2 py-0.5 text-[11px] text-error font-body">
              Unanswered
            </span>
          ) : (
            <span className="text-[12px] text-muted font-body">{thread.replyCount} repl{thread.replyCount === 1 ? "y" : "ies"}</span>
          )}
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-body font-body line-clamp-2">{thread.body}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {endorsed ? (
          <span className="flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[12px] font-medium font-body text-success">
            <CheckCircle className="size-3.5" /> Endorsed
          </span>
        ) : (
          <Button variant="secondary" size="sm" onClick={onEndorse}>
            Endorse
          </Button>
        )}
        <div className="flex items-center gap-1 text-[12px] text-muted font-body">
          <CaretUp className="size-3.5" /> {thread.upvotes}
        </div>
      </div>
    </div>
  );
}

export function ReviewQueue({ courseId }: { courseId: string }) {
  const toast = useToast();

  const reviewableWidgets = peerWidgets.filter((w) => w.status === "in-review");

  const [widgetStatuses, setWidgetStatuses] = React.useState<Record<string, ReviewStatus>>(() =>
    Object.fromEntries(reviewableWidgets.map((w) => [w.id, "in-review" as ReviewStatus]))
  );
  const [widgetNotes, setWidgetNotes] = React.useState<Record<string, string>>({});

  const pendingCount = Object.values(widgetStatuses).filter((s) => s === "in-review").length;

  const unendorsedThreads = forumThreads.filter((t) => !t.endorsed);
  const [endorsedIds, setEndorsedIds] = React.useState<Set<string>>(new Set());

  function approveWidget(id: string) {
    setWidgetStatuses((prev) => ({ ...prev, [id]: "approved" }));
    toast.push({ message: "Merged into lesson · students will see it immediately" });
  }

  function requestChanges(id: string, note: string) {
    setWidgetStatuses((prev) => ({ ...prev, [id]: "changes-requested" }));
    setWidgetNotes((prev) => ({ ...prev, [id]: note }));
    toast.push({ message: "Feedback sent · student can revise and resubmit" });
  }

  function archiveWidget(id: string) {
    setWidgetStatuses((prev) => ({ ...prev, [id]: "archived" }));
    toast.push({ message: "Widget archived · student notified" });
  }

  function undoWidget(id: string) {
    setWidgetStatuses((prev) => ({ ...prev, [id]: "in-review" }));
    setWidgetNotes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function endorseThread(id: string) {
    setEndorsedIds((prev) => new Set([...prev, id]));
    toast.push({ message: "Thread endorsed · pinned for the class" });
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav courseId={courseId} activeHref={`/course/${courseId}/review`} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[13px] font-medium font-body uppercase tracking-[1px] text-accent-text">
          Review queue
        </p>
        <h1 className="mt-1">Student submissions</h1>
        <p className="mt-2 text-[15px] text-muted font-body">
          Approve or give feedback on widget submissions, and endorse quality questions.
        </p>

        <div className="mt-8">
          <Tabs defaultValue="widgets">
            <TabList>
              <TabTrigger value="widgets">
                Widgets
                {pendingCount > 0 ? (
                  <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-[#bb5a3a] text-[10px] font-medium text-white">
                    {pendingCount}
                  </span>
                ) : null}
              </TabTrigger>
              <TabTrigger value="questions">
                Questions
                {unendorsedThreads.length - endorsedIds.size > 0 ? (
                  <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-surface-card text-[10px] font-medium text-muted border border-hairline">
                    {unendorsedThreads.length - endorsedIds.size}
                  </span>
                ) : null}
              </TabTrigger>
            </TabList>

            <TabPanel value="widgets" className="mt-6">
              {reviewableWidgets.length === 0 ? (
                <p className="py-12 text-center text-[15px] text-muted font-body">
                  No widget submissions waiting for review.
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingCount === 0 ? (
                    <div className="rounded-[var(--radius-control)] border border-success/30 bg-success/8 px-4 py-3 text-[14px] font-body text-success-text">
                      Queue is clear — all submissions reviewed.
                    </div>
                  ) : null}
                  {reviewableWidgets.map((w) => (
                    <WidgetReviewCard
                      key={w.id}
                      widget={w}
                      status={widgetStatuses[w.id] ?? "in-review"}
                      note={widgetNotes[w.id] ?? ""}
                      onApprove={() => approveWidget(w.id)}
                      onRequestChanges={(note) => requestChanges(w.id, note)}
                      onArchive={() => archiveWidget(w.id)}
                      onUndo={() => undoWidget(w.id)}
                    />
                  ))}
                </div>
              )}
            </TabPanel>

            <TabPanel value="questions" className="mt-6">
              {unendorsedThreads.length === 0 ? (
                <p className="py-12 text-center text-[15px] text-muted font-body">
                  All questions have been endorsed — great work!
                </p>
              ) : (
                <div className="space-y-2">
                  {endorsedIds.size >= unendorsedThreads.length ? (
                    <div className="mb-1 rounded-[var(--radius-control)] border border-success/30 bg-success/8 px-4 py-3 text-[14px] font-body text-success-text">
                      All questions endorsed — queue is clear.
                    </div>
                  ) : null}
                  {unendorsedThreads.map((t) => (
                    <QuestionReviewRow
                      key={t.id}
                      thread={t}
                      endorsed={endorsedIds.has(t.id)}
                      onEndorse={() => endorseThread(t.id)}
                    />
                  ))}
                </div>
              )}
            </TabPanel>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
