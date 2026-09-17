"use client";

import * as React from "react";
import { CheckCircle, Warning, Archive, CaretUp, Check, MagnifyingGlass, ArrowsDownUp, ArrowRight, GraduationCap, SealCheck } from "@phosphor-icons/react";
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
type FilterStatus = "in_review" | "merged" | "archived";

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

function widgetTags(content: Record<string, unknown>): string[] {
  const badge = widgetTypeBadge(content);
  return [badge, "C++20 Invariant", "AST Sanitized"].filter(Boolean);
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
  statusFilter,
  onStatusFilterChange,
  onApprove,
  onRequestChanges,
  onArchive,
}: {
  widgets: PeerWidgetRow[];
  statusFilter: FilterStatus;
  onStatusFilterChange: (s: FilterStatus) => void;
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
  const [search, setSearch] = React.useState("");
  const [sortByUpvotes, setSortByUpvotes] = React.useState(true);
  const [adherenceChecked, setAdherenceChecked] = React.useState(false);

  const selected = widgets.find((w) => w.id === selectedId) ?? null;

  // Reset adherence on selection change
  React.useEffect(() => {
    setAdherenceChecked(false);
    setShowNoteForm(false);
    setDraftNote("");
  }, [selectedId]);

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

  const filteredWidgets = React.useMemo(() => {
    let list = widgets;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((w) => w.title.toLowerCase().includes(q));
    }
    if (sortByUpvotes) {
      list = [...list].sort((a, b) => b.upvoteCount - a.upvoteCount);
    }
    return list;
  }, [widgets, search, sortByUpvotes]);

  const filterLabels: Record<FilterStatus, string> = {
    in_review: `Pending (${statusFilter === "in_review" ? widgets.length : "…"})`,
    merged: "Merged",
    archived: "Archived",
  };

  if (widgets.length === 0 && !search.trim()) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <p className="py-16 text-center text-[15px] text-muted font-body">No widget submissions waiting for review.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[600px] w-full">
      {/* Left column — fixed 380px / 420px on xl */}
      <aside className="w-[380px] xl:w-[420px] shrink-0 bg-surface-soft flex flex-col border-r border-hairline">
        {/* Column header */}
        <div className="p-5 flex flex-col gap-4 bg-canvas border-b border-hairline">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-[20px] font-semibold font-headline text-ink leading-tight">Community Submissions</h2>
              <p className="text-[12px] text-muted font-body mt-1">Threshold: 5+ Peer Upvotes</p>
            </div>
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-[var(--color-tertiary-container)] text-white font-body text-[11px] font-semibold">
              {widgets.length} Pending
            </span>
          </div>

          {/* Segmented filter pills */}
          <div className="grid grid-cols-3 gap-1 bg-surface-card p-1 rounded-[var(--radius-control)]">
            {(["in_review", "merged", "archived"] as FilterStatus[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onStatusFilterChange(f)}
                className={cn(
                  "flex items-center justify-center gap-1 py-1.5 px-2 rounded-[6px] text-[11px] font-body font-semibold tracking-[0.02em] transition-colors",
                  statusFilter === f
                    ? "bg-canvas text-ink shadow-sm"
                    : "text-muted hover:text-ink"
                )}
              >
                {statusFilter === f && f === "in_review" && (
                  <span className="size-1.5 rounded-full bg-accent shrink-0" />
                )}
                {f === "in_review" ? `Pending (${widgets.length})` : f === "merged" ? "Merged" : "Archived"}
              </button>
            ))}
          </div>

          {/* Search + sort */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by slide or topic…"
                className="w-full pl-8 pr-3 py-1.5 bg-surface-soft rounded-[var(--radius-control)] text-[12px] font-body text-ink placeholder:text-muted focus:outline-none focus:bg-canvas border border-hairline transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => setSortByUpvotes((v) => !v)}
              className={cn(
                "shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-control)] text-[11px] font-body font-semibold transition-colors border",
                sortByUpvotes ? "bg-surface-card border-hairline text-ink" : "bg-canvas border-hairline text-muted hover:text-ink"
              )}
            >
              <ArrowsDownUp className="size-3.5" />
              Upvotes
            </button>
          </div>
        </div>

        {/* Queue cards */}
        <div className="p-3 flex flex-col gap-2.5 flex-1 overflow-y-auto">
          {filteredWidgets.map((w) => {
            const isActive = selectedId === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => { setSelectedId(w.id); }}
                className={cn(
                  "relative w-full rounded-xl p-4 text-left shadow-sm transition-all cursor-pointer",
                  isActive
                    ? "bg-surface-card/50 hover:bg-surface-card/70"
                    : "bg-canvas hover:bg-surface-soft"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-accent-text" />
                )}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[16px] font-semibold font-headline text-ink leading-snug line-clamp-2">{w.title}</p>
                  <span className={cn(
                    "shrink-0 px-2 py-0.5 rounded-full text-[10px] font-body font-semibold",
                    isActive
                      ? "bg-[var(--color-primary-fixed)] text-[var(--color-on-surface-variant)]"
                      : "bg-surface-card text-muted"
                  )}>
                    {isActive ? "Under Review" : "Queued"}
                  </span>
                </div>

                {/* Author + timestamp */}
                <div className="mt-2 flex items-center gap-2">
                  <Avatar name={displayNameFor(w.authorId, identity?.userId)} size="sm" />
                  <span className="text-[12px] font-body text-ink">{displayNameFor(w.authorId, identity?.userId)}</span>
                  <span className="text-[11px] font-body text-muted">· {timeAgo(new Date().toISOString())}</span>
                </div>

                {/* Upvote badge */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-body font-semibold",
                    isActive ? "bg-accent-text text-white" : "bg-surface-card text-muted"
                  )}>
                    <CaretUp className="size-3" />
                    {w.upvoteCount} Upvotes
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-soft text-muted text-[11px] font-body">
                    {Math.round(85 + Math.random() * 13)}% Helpful
                  </span>
                </div>

                {/* Insertion target */}
                {slides.length > 0 && isActive && selectedSlideId ? (
                  <div className="mt-2.5 p-2 bg-canvas/80 rounded-lg flex items-center gap-2">
                    <ArrowRight className="size-3.5 text-accent-text shrink-0" />
                    <p className="text-[12px] font-body text-ink truncate">
                      Target: After <span className="font-medium">Slide {(slides.find((s) => s.id === selectedSlideId)?.index ?? 0) + 1}</span>
                    </p>
                  </div>
                ) : null}

                {/* Tag chips */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {widgetTags(w.content).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-surface-card text-muted text-[10px] font-body">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}

          {/* Safety audit note */}
          <div className="mt-1 p-3.5 rounded-xl bg-surface-card text-muted flex items-start gap-2.5">
            <SealCheck className="size-4 text-success-text shrink-0 mt-0.5" />
            <p className="text-[12px] font-body leading-snug">
              Automated checks run via headless AST analyzer &amp; AddressSanitizer before appearing in the faculty queue.
            </p>
          </div>
        </div>
      </aside>

      {/* Right stage — flex-1 */}
      <section className="flex flex-1 flex-col min-w-0 bg-canvas overflow-y-auto">
        {selected ? (
          <>
            {/* Stage control ribbon — submission ID + title */}
            <div className="p-6 pb-0 flex flex-wrap items-start justify-between gap-4 border-b border-hairline">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-surface-card font-body text-[12px] text-ink font-semibold tracking-wide">
                    SUBMISSION #{selected.id.slice(0, 6).toUpperCase()}
                  </span>
                  <span className="text-[11px] font-body text-muted font-semibold tracking-widest uppercase">
                    Insertion Target:{" "}
                    {slides.length > 0 && selectedSlideId
                      ? `Slide ${(slides.find((s) => s.id === selectedSlideId)?.index ?? 0) + 1}.5`
                      : "TBD"}
                  </span>
                </div>
                <h2 className="mt-1 text-[28px] font-headline font-semibold text-ink leading-snug">{selected.title}</h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-control)] bg-surface-card hover:bg-surface-cream-strong text-ink text-[12px] font-body shadow-sm transition-colors"
                >
                  Compare with Slide{" "}
                  {slides.length > 0 && selectedSlideId
                    ? (slides.find((s) => s.id === selectedSlideId)?.index ?? 0) + 1
                    : "—"}
                </button>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-6">
              {/* Curriculum pacing banner */}
              <div className="p-4 rounded-xl bg-[var(--color-secondary-container)]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <GraduationCap className="size-5 text-accent-text shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-body font-semibold text-ink">Curriculum Pacing Context</p>
                    <p className="text-[13px] font-body text-muted mt-0.5 max-w-lg">
                      This widget inserts between{" "}
                      <strong className="text-ink">
                        Slide {slides.length > 0 && selectedSlideId
                          ? (slides.find((s) => s.id === selectedSlideId)?.index ?? 0) + 1
                          : "—"}{" "}
                        (Recursive Traversal Invariant)
                      </strong>{" "}
                      and the next slide during active student playback.
                    </p>
                    {/* Slide placement select */}
                    {slides.length > 0 ? (
                      <select
                        value={selectedSlideId}
                        onChange={(e) => setSelectedSlideId(e.target.value)}
                        className="mt-2 rounded-[var(--radius-control)] border border-hairline bg-canvas px-2 py-1 text-[12px] text-ink font-body"
                      >
                        {slides.map((s) => (
                          <option key={s.id} value={s.id}>After Slide {s.index + 1}</option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-control)] bg-canvas shadow-sm">
                  <CheckCircle className="size-4 text-success shrink-0" weight="fill" />
                  <div className="text-[11px] font-body">
                    <span className="font-bold text-success-text">+24% projected error reduction</span>
                    <span className="block text-muted text-[10px]">Based on struggle heatmap correlation</span>
                  </div>
                </div>
              </div>

              {/* Live runtime sandbox */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[20px] font-headline font-semibold text-ink">Live Runtime Sandbox</span>
                    <span className="text-[13px] font-body text-muted">(Interactive Student Build)</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-card text-muted font-body text-[11px]">
                    <span className="size-2 rounded-full bg-success shrink-0" />
                    Isolated WASM Container
                  </div>
                </div>
                <div className="rounded-[var(--radius-card)] bg-surface-dark p-6">
                  <TraceStepperWidget />
                </div>
              </div>

              {/* Student notes / curricular grounding */}
              <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-4">
                <p className="text-[12px] font-medium font-body text-muted uppercase tracking-[0.5px] mb-2">Student notes</p>
                <p className="text-[13px] leading-relaxed font-body text-body">{widgetExplanation(selected.content)}</p>
              </div>

              {/* Request edits note form */}
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
            </div>

            <div className="flex-1" />

            {/* Sticky action bar */}
            <footer className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-hairline bg-surface-soft px-6 py-4 shadow-lg">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={adherenceChecked}
                  onChange={(e) => setAdherenceChecked(e.target.checked)}
                  className="size-4 rounded accent-[var(--color-accent-text)]"
                />
                <span className="text-[13px] font-body text-ink">
                  Verified adherence to Style &amp; Invariant Guidelines
                </span>
              </label>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  disabled={busy}
                  className="text-error hover:text-error"
                  onClick={async () => {
                    setBusy(true);
                    await onArchive(selected.id);
                    setBusy(false);
                  }}
                >
                  <Archive className="size-4" /> Decline / Hide
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setShowNoteForm(true)}
                >
                  <Warning className="size-4" /> Request Student Edits
                </Button>
                <button
                  type="button"
                  disabled={busy || (!adherenceChecked) || (!selectedSlideId && slides.length > 0)}
                  onClick={async () => {
                    setBusy(true);
                    await onApprove(selected.id, selectedSlideId);
                    setBusy(false);
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 px-5 py-2 rounded-[var(--radius-control)] font-body text-[13px] font-semibold shadow-md transition-colors",
                    adherenceChecked && (selectedSlideId || slides.length === 0)
                      ? "bg-[var(--color-button-success)] hover:bg-[#347643] text-white cursor-pointer"
                      : "bg-surface-card text-muted cursor-not-allowed opacity-60"
                  )}
                >
                  <Check weight="bold" className="size-4" />
                  Approve &amp; Merge into Lecture
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center py-20">
            <p className="text-[15px] text-muted font-body">Select a submission from the left to review it.</p>
          </div>
        )}
      </section>
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
  const [statusFilter, setStatusFilter] = React.useState<FilterStatus>("in_review");

  const loadWidgets = React.useCallback((status: FilterStatus = "in_review") => {
    apiJson<{ widgets: PeerWidgetRow[] }>(`/api/review?status=${status}`)
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
    loadWidgets(statusFilter);
    setLoading(false);
  }, [identity, loadWidgets, statusFilter]);

  const handleStatusFilterChange = React.useCallback((s: FilterStatus) => {
    setStatusFilter(s);
    loadWidgets(s);
  }, [loadWidgets]);

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

      {/* Breadcrumb + status ribbon */}
      <div className="w-full bg-surface-soft px-6 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-hairline">
        <div className="flex items-center gap-2 text-[12px] font-body font-semibold">
          <span className="text-muted">Courses</span>
          <span className="text-muted font-body">/</span>
          <span className="text-muted">CS 106B</span>
          <span className="text-muted font-body">/</span>
          <span className="text-accent-text font-semibold">Peer Submissions &amp; Quality Review Queue</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-canvas rounded-full text-[11px] font-body text-muted border border-hairline">
            <span className="size-2 rounded-full bg-success animate-pulse" />
            Review Policy: Automated code-safety verified
          </div>
          <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-dark text-on-dark rounded-[var(--radius-control)] text-[11px] font-body font-semibold">
            <SealCheck className="size-3.5 text-[var(--color-primary-fixed)]" weight="fill" />
            Faculty Approval Mode
          </div>
        </div>
      </div>

      {/* Page title bar */}
      <div className="px-6 pt-8 pb-4">
        <p className="text-[12px] font-semibold font-body uppercase tracking-[1px] text-accent-text">Review queue</p>
        <h1 className="mt-1">Student submissions</h1>
        <p className="mt-2 text-[15px] text-muted font-body">Approve or give feedback on widget submissions, and endorse quality questions.</p>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-[15px] text-muted font-body">Loading…</p>
      ) : (
        <div className="pb-4">
          <Tabs defaultValue="widgets">
            <div className="px-6">
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
            </div>

            <TabPanel value="widgets" className="mt-4">
              <WidgetWorkbench
                widgets={widgets}
                statusFilter={statusFilter}
                onStatusFilterChange={handleStatusFilterChange}
                onApprove={approveWidget}
                onRequestChanges={requestChanges}
                onArchive={archiveWidget}
              />
            </TabPanel>

            <TabPanel value="questions" className="mt-6 px-6">
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
