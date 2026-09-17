"use client";

import * as React from "react";
import { CheckCircle, Warning, Archive, CaretUp, Check } from "@phosphor-icons/react";
import { AppNav } from "@/components/nav/app-nav";
import { Tabs, TabList, TabTrigger, TabPanel } from "@/components/ui/tabs";
import { TraceStepperWidget } from "@/components/widgets/trace-stepper-widget";
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
  return "Widget";
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

function WidgetWorkbench({
  widgets,
  onApprove,
  onRequestChanges,
  onArchive,
}: {
  widgets: PeerWidgetRow[];
  onApprove: (id: string, afterSlideId: string) => Promise<void>;
  onRequestChanges: (id: string, note: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
}) {
  const identity = useIdentity();
  const [selectedId, setSelectedId] = React.useState<string | null>(widgets[0]?.id ?? null);
  const [slides, setSlides] = React.useState<PlacementSlide[]>([]);
  const [selectedSlideId, setSelectedSlideId] = React.useState("");
  const [showNoteForm, setShowNoteForm] = React.useState(false);
  const [draftNote, setDraftNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const selected = widgets.find((w) => w.id === selectedId) ?? null;

  // Keep selectedId pointing at a valid widget
  React.useEffect(() => {
    if (!selectedId && widgets.length > 0) setSelectedId(widgets[0]!.id);
    if (selectedId && !widgets.find((w) => w.id === selectedId) && widgets.length > 0) {
      setSelectedId(widgets[0]!.id);
    }
  }, [widgets, selectedId]);

  // Load placement slides when selection changes
  React.useEffect(() => {
    if (!selectedId || identity?.role !== "teacher") return;
    setSlides([]);
    setSelectedSlideId("");
    apiJson<{ lectureId: string | null; slides: PlacementSlide[] }>(`/api/review/${selectedId}/placement`)
      .then((data) => {
        setSlides(data.slides);
        if (data.slides[0]) setSelectedSlideId(data.slides[0].id);
      })
      .catch(() => {});
  }, [selectedId, identity]);

  if (widgets.length === 0) {
    return <p className="py-16 text-center text-[15px] text-muted font-body">No widget submissions waiting for review.</p>;
  }

  return (
    <div className="flex min-h-[600px]">
      {/* Left column — 35% */}
      <div className="w-[35%] shrink-0 overflow-y-auto border-r border-hairline">
        <div className="p-3 space-y-1">
          {widgets.map((w) => (
            <button
              key={w.id}
              onClick={() => { setSelectedId(w.id); setShowNoteForm(false); setDraftNote(""); }}
              className={cn(
                "w-full rounded-[var(--radius-control)] p-3 text-left transition-colors",
                selectedId === w.id ? "bg-surface-card" : "hover:bg-surface-soft"
              )}
            >
              <p className="text-[14px] font-medium font-body text-ink line-clamp-1">{w.title}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-hairline px-2 py-0.5 text-[11px] font-body text-muted">
                  {widgetTypeBadge(w.content)}
                </span>
                <span className="flex items-center gap-1 text-[12px] font-body text-muted">
                  <CaretUp className="size-3" /> {w.upvoteCount}
                </span>
              </div>
              <p className="mt-1 text-[12px] font-body text-muted">
                {displayNameFor(w.authorId, identity?.userId)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Right stage — 65% */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {selected ? (
          <>
            {/* Positioning banner */}
            <div className="border-b border-hairline bg-surface-soft px-6 py-3">
              <p className="text-[13px] font-body text-muted">
                Positioning preview — this widget will appear
                {slides.length > 0 && selectedSlideId
                  ? ` after Slide ${(slides.find((s) => s.id === selectedSlideId)?.index ?? 0) + 1}`
                  : " in the lecture"}
              </p>
              {slides.length > 0 ? (
                <select
                  value={selectedSlideId}
                  onChange={(e) => setSelectedSlideId(e.target.value)}
                  className="mt-1.5 rounded-[var(--radius-control)] border border-hairline bg-canvas px-2 py-1 text-[12px] text-ink font-body"
                >
                  {slides.map((s) => (
                    <option key={s.id} value={s.id}>After Slide {s.index + 1}</option>
                  ))}
                </select>
              ) : null}
            </div>

            {/* Widget sandbox */}
            <div className="px-6 pt-6">
              <div className="rounded-[var(--radius-card)] bg-surface-dark p-6">
                <TraceStepperWidget />
              </div>
            </div>

            {/* Student notes */}
            <div className="mx-6 mt-4 rounded-[var(--radius-card)] border border-hairline bg-surface-card p-4">
              <p className="text-[12px] font-medium font-body text-muted uppercase tracking-[0.5px] mb-2">Student notes</p>
              <p className="text-[13px] leading-relaxed font-body text-body">{widgetExplanation(selected.content)}</p>
            </div>

            {/* Request edits note form */}
            {showNoteForm ? (
              <div className="mx-6 mt-4 space-y-2">
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
                    disabled={!draftNote.trim() || busy}
                    onClick={async () => {
                      setBusy(true);
                      await onRequestChanges(selected.id, draftNote.trim());
                      setBusy(false);
                      setShowNoteForm(false);
                      setDraftNote("");
                    }}
                  >
                    Send feedback
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowNoteForm(false); setDraftNote(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex-1" />

            {/* Sticky action bar */}
            <div className="sticky bottom-0 mt-4 flex items-center gap-3 border-t border-hairline bg-canvas px-6 py-4">
              <Button
                variant="primary"
                disabled={busy || (!selectedSlideId && slides.length > 0)}
                className="gap-1.5"
                onClick={async () => {
                  setBusy(true);
                  await onApprove(selected.id, selectedSlideId);
                  setBusy(false);
                }}
              >
                <Check weight="bold" className="size-4" /> Approve &amp; Merge
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setShowNoteForm(true)}
              >
                <Warning className="size-4" /> Request Edits
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                className="ml-auto text-error hover:text-error"
                onClick={async () => {
                  setBusy(true);
                  await onArchive(selected.id);
                  setBusy(false);
                }}
              >
                <Archive className="size-4" /> Decline / Archive
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center py-20">
            <p className="text-[15px] text-muted font-body">Select a submission from the left to review it.</p>
          </div>
        )}
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
      <div className="mx-auto max-w-3xl px-6 pt-10 pb-4">
        <p className="text-[13px] font-medium font-body uppercase tracking-[1px] text-accent-text">Review queue</p>
        <h1 className="mt-1">Student submissions</h1>
        <p className="mt-2 text-[15px] text-muted font-body">Approve or give feedback on widget submissions, and endorse quality questions.</p>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-[15px] text-muted font-body">Loading…</p>
      ) : (
        <div className="mx-auto max-w-3xl px-6 pb-4">
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
              <WidgetWorkbench
                widgets={widgets}
                onApprove={approveWidget}
                onRequestChanges={requestChanges}
                onArchive={archiveWidget}
              />
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
    </div>
  );
}
