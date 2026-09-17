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
import { apiJson, ApiError } from "@/lib/api-client";
import { useIdentity } from "@/lib/identity";
import { displayNameFor } from "@/lib/display-name";
import { timeAgo } from "@/lib/time-ago";
import type { FaqThreadRow } from "@/components/forum/questions-tab";
import type { ModuleOption } from "@/components/forum/forum";

type PeerStatus = "collecting" | "in_review" | "changes_requested" | "merged" | "archived";

interface PeerWidgetRow {
  id: string;
  authorId: string;
  title: string;
  content: Record<string, unknown>;
  tagLectureId: string | null;
  status: PeerStatus;
  upvoteCount: number;
}

interface PlacementSlide {
  id: string;
  index: number;
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

function WidgetReviewCard({
  widget,
  onApprove,
  onRequestChanges,
  onArchive,
}: {
  widget: PeerWidgetRow;
  onApprove: (afterSlideId: string) => Promise<void>;
  onRequestChanges: (note: string) => Promise<void>;
  onArchive: () => Promise<void>;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [draftNote, setDraftNote] = React.useState("");
  const [showNoteForm, setShowNoteForm] = React.useState(false);
  const [slides, setSlides] = React.useState<PlacementSlide[]>([]);
  const [selectedSlideId, setSelectedSlideId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const identity = useIdentity();

  React.useEffect(() => {
    if (!expanded || identity?.role !== "teacher") return;
    apiJson<{ lectureId: string | null; slides: PlacementSlide[] }>(`/api/review/${widget.id}/placement`)
      .then((data) => {
        setSlides(data.slides);
        if (data.slides[0]) setSelectedSlideId(data.slides[0].id);
      })
      .catch(() => {});
  }, [expanded, widget.id, identity]);

  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-5">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="min-w-0">
          <p className="text-[15px] font-medium font-body text-ink">{widget.title}</p>
          <p className="mt-0.5 text-[12px] text-muted font-body">
            {displayNameFor(widget.authorId, identity?.userId)} · {widget.upvoteCount} upvote{widget.upvoteCount !== 1 ? "s" : ""}
          </p>
        </div>
        <CaretDown className={cn("size-4 shrink-0 text-muted transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded ? (
        <div className="mt-4 space-y-4">
          <WidgetSlot typeBadge={widgetTypeBadge(widget.content)} title={widget.title} explanation={widgetExplanation(widget.content)} size="compact" />

          {showNoteForm ? (
            <div className="space-y-2">
              <Textarea rows={3} value={draftNote} onChange={(e) => setDraftNote(e.target.value)} placeholder="Explain what needs to change…" />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!draftNote.trim() || busy}
                  onClick={async () => {
                    setBusy(true);
                    await onRequestChanges(draftNote.trim());
                    setBusy(false);
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
          ) : (
            <div className="space-y-3">
              {slides.length > 0 ? (
                <label className="block text-[12px] font-medium font-body text-muted">
                  Insert after slide
                  <select
                    value={selectedSlideId}
                    onChange={(e) => setSelectedSlideId(e.target.value)}
                    className="mt-1 block w-full rounded-[var(--radius-control)] border border-hairline bg-canvas px-3 py-2 text-[14px] text-ink font-body"
                  >
                    {slides.map((s) => (
                      <option key={s.id} value={s.id}>
                        Slide (index {s.index})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={busy || !selectedSlideId}
                  onClick={async () => {
                    setBusy(true);
                    await onApprove(selectedSlideId);
                    setBusy(false);
                  }}
                >
                  <CheckCircle className="size-4" /> Approve
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowNoteForm(true)}>
                  <Warning className="size-4" /> Request changes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await onArchive();
                    setBusy(false);
                  }}
                >
                  <Archive className="size-4" /> Archive
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function QuestionReviewRow({
  thread,
  moduleName,
  onEndorse,
}: {
  thread: FaqThreadRow;
  moduleName: string;
  onEndorse: () => Promise<void>;
}) {
  const identity = useIdentity();
  const [busy, setBusy] = React.useState(false);

  return (
    <div className="flex items-start justify-between gap-3 rounded-[var(--radius-control)] border border-hairline bg-surface-card p-4">
      <div className="min-w-0">
        <p className="text-[14px] font-medium font-body text-ink">{thread.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Avatar name={displayNameFor(thread.authorId, identity?.userId)} size="sm" />
          <span className="text-[12px] text-muted font-body">
            {displayNameFor(thread.authorId, identity?.userId)} · {timeAgo(thread.createdAt)} · {moduleName}
          </span>
          {thread.replyCount === 0 ? (
            <span className="rounded-full border border-error/30 bg-error/8 px-2 py-0.5 text-[11px] text-error font-body">Unanswered</span>
          ) : (
            <span className="text-[12px] text-muted font-body">
              {thread.replyCount} repl{thread.replyCount === 1 ? "y" : "ies"}
            </span>
          )}
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-body font-body line-clamp-2">{thread.bodyMd}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onEndorse();
            setBusy(false);
          }}
        >
          Endorse
        </Button>
        <div className="flex items-center gap-1 text-[12px] text-muted font-body">
          <CaretUp className="size-3.5" /> {thread.upvoteCount}
        </div>
      </div>
    </div>
  );
}

export function ReviewQueue({ courseId }: { courseId: string }) {
  const toast = useToast();
  const identity = useIdentity();
  const [widgets, setWidgets] = React.useState<PeerWidgetRow[]>([]);
  const [threads, setThreads] = React.useState<FaqThreadRow[]>([]);
  const [modules, setModules] = React.useState<ModuleOption[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadWidgets = React.useCallback(() => {
    apiJson<{ widgets: PeerWidgetRow[] }>("/api/review?status=in_review")
      .then((data) => setWidgets(data.widgets))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!identity || identity.role !== "teacher") return;
    setLoading(true);
    Promise.all([
      apiJson<{ threads: FaqThreadRow[] }>("/api/faq/threads?includeLogistics=true&limit=50"),
      apiJson<{ modules: { id: string; name: string }[] }>("/api/course"),
    ])
      .then(([threadData, courseData]) => {
        setThreads(threadData.threads.filter((t) => !t.endorsed));
        setModules(courseData.modules.map((m) => ({ id: m.id, name: m.name })));
      })
      .catch(() => {});
    loadWidgets();
    setLoading(false);
  }, [identity, loadWidgets]);

  const pendingCount = widgets.length;
  const moduleName = (id: string) => modules.find((m) => m.id === id)?.name ?? "Module";

  async function approveWidget(id: string, afterSlideId: string) {
    try {
      await apiJson(`/api/review/${id}/approve`, { method: "POST", body: JSON.stringify({ afterSlideId }) });
      setWidgets((prev) => prev.filter((w) => w.id !== id));
      toast.push({ message: "Merged into lesson · students will see it immediately" });
    } catch (err) {
      toast.push({ message: err instanceof ApiError ? err.message : "Failed to approve" });
    }
  }

  async function requestChanges(id: string, note: string) {
    try {
      await apiJson(`/api/review/${id}/request-edits`, { method: "POST", body: JSON.stringify({ teacherNote: note }) });
      setWidgets((prev) => prev.filter((w) => w.id !== id));
      toast.push({ message: "Feedback sent · student can revise and resubmit" });
    } catch (err) {
      toast.push({ message: err instanceof ApiError ? err.message : "Failed to send feedback" });
    }
  }

  async function archiveWidget(id: string) {
    try {
      await apiJson(`/api/review/${id}/decline`, { method: "POST", body: JSON.stringify({}) });
      setWidgets((prev) => prev.filter((w) => w.id !== id));
      toast.push({ message: "Widget archived · student notified" });
    } catch (err) {
      toast.push({ message: err instanceof ApiError ? err.message : "Failed to archive" });
    }
  }

  async function endorseThread(id: string) {
    try {
      await apiJson(`/api/faq/threads/${id}/endorse`, { method: "POST" });
      setThreads((prev) => prev.filter((t) => t.id !== id));
      toast.push({ message: "Thread endorsed · pinned for the class" });
    } catch (err) {
      toast.push({ message: err instanceof ApiError ? err.message : "Failed to endorse" });
    }
  }

  if (identity && identity.role !== "teacher") {
    return (
      <div className="min-h-screen bg-canvas">
        <AppNav courseId={courseId} activeHref={`/course/${courseId}/review`} />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <p className="text-[15px] text-muted font-body">The review queue is only available to teachers.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav courseId={courseId} activeHref={`/course/${courseId}/review`} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[13px] font-medium font-body uppercase tracking-[1px] text-accent-text">Review queue</p>
        <h1 className="mt-1">Student submissions</h1>
        <p className="mt-2 text-[15px] text-muted font-body">Approve or give feedback on widget submissions, and endorse quality questions.</p>

        {loading ? (
          <p className="mt-8 text-center text-[15px] text-muted font-body">Loading…</p>
        ) : (
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
                  {threads.length > 0 ? (
                    <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-surface-card text-[10px] font-medium text-muted border border-hairline">
                      {threads.length}
                    </span>
                  ) : null}
                </TabTrigger>
              </TabList>

              <TabPanel value="widgets" className="mt-6">
                {widgets.length === 0 ? (
                  <p className="py-12 text-center text-[15px] text-muted font-body">No widget submissions waiting for review.</p>
                ) : (
                  <div className="space-y-3">
                    {widgets.map((w) => (
                      <WidgetReviewCard
                        key={w.id}
                        widget={w}
                        onApprove={(afterSlideId) => approveWidget(w.id, afterSlideId)}
                        onRequestChanges={(note) => requestChanges(w.id, note)}
                        onArchive={() => archiveWidget(w.id)}
                      />
                    ))}
                  </div>
                )}
              </TabPanel>

              <TabPanel value="questions" className="mt-6">
                {threads.length === 0 ? (
                  <p className="py-12 text-center text-[15px] text-muted font-body">All questions have been endorsed — great work!</p>
                ) : (
                  <div className="space-y-2">
                    {threads.map((t) => (
                      <QuestionReviewRow key={t.id} thread={t} moduleName={moduleName(t.tagModuleId)} onEndorse={() => endorseThread(t.id)} />
                    ))}
                  </div>
                )}
              </TabPanel>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}
