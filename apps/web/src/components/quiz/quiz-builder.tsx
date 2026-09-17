"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { apiJson } from "@/lib/api-client";

interface ModuleRow {
  id: string;
  name: string;
  status: string;
}

interface LectureRow {
  id: string;
  moduleId: string;
  title: string;
  orderIndex: number;
  parseStatus: string;
}

interface ModuleWithLectures extends ModuleRow {
  lectures: LectureRow[];
}

export function QuizBuilder({
  onGenerate,
  initialSelected,
}: {
  onGenerate: (lectureIds: string[]) => void;
  initialSelected?: string[];
}) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [moduleList, setModuleList] = React.useState<ModuleWithLectures[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set(initialSelected));
  const [generating, setGenerating] = React.useState(false);
  const [savedSession, setSavedSession] = React.useState<{ lectureIds: string[] } | null>(null);
  const treeRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const raw = window.localStorage.getItem("keplerlearn:quiz:saved-session");
    if (raw) {
      try {
        setSavedSession(JSON.parse(raw));
      } catch {
        // ignore malformed saved session
      }
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { modules } = await apiJson<{ modules: ModuleRow[] }>("/api/course");
        const published = modules.filter((m) => m.status === "published");
        const withLectures = await Promise.all(
          published.map(async (m) => {
            const lectures = await apiJson<LectureRow[]>(`/api/modules/${m.id}/lectures`);
            return { ...m, lectures: lectures.filter((l) => l.parseStatus === "parsed") };
          }),
        );
        if (!cancelled) setModuleList(withLectures.filter((m) => m.lectures.length > 0));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load lectures");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function resumeSaved() {
    window.localStorage.removeItem("keplerlearn:quiz:saved-session");
    onGenerate(savedSession!.lectureIds);
  }

  function toggleLecture(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleModule(lectureIds: string[], allSelected: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) lectureIds.forEach((n) => next.delete(n));
      else lectureIds.forEach((n) => next.add(n));
      return next;
    });
  }

  const selectedCount = selected.size;

  function handleTreeKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const container = treeRef.current;
    if (!container) return;
    const boxes = Array.from(
      container.querySelectorAll<HTMLInputElement>("input[type='checkbox']:not(:disabled)")
    );
    const idx = boxes.indexOf(document.activeElement as HTMLInputElement);
    if (e.key === "ArrowDown" && idx < boxes.length - 1) boxes[idx + 1]?.focus();
    if (e.key === "ArrowUp" && idx > 0) boxes[idx - 1]?.focus();
  }

  function generate() {
    if (selectedCount === 0) return;
    setGenerating(true);
    onGenerate([...selected]);
  }

  if (loading) {
    return <p className="mx-auto max-w-2xl py-20 text-center text-[15px] text-muted font-body">Loading lectures…</p>;
  }

  if (error) {
    return <p className="mx-auto max-w-2xl py-20 text-center text-[15px] text-error font-body">{error}</p>;
  }

  if (generating) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p aria-live="polite" className="text-[16px] text-body font-body">
          Building a quiz from {selectedCount} {selectedCount === 1 ? "lecture" : "lectures"}…
        </p>
        <Button variant="ghost" className="mt-4" onClick={() => setGenerating(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {savedSession ? (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-hairline bg-surface-card px-4 py-3">
          <p className="text-[14px] font-body text-ink">
            You have an unfinished quiz from {savedSession.lectureIds.length} lecture{savedSession.lectureIds.length !== 1 ? "s" : ""}.
          </p>
          <Button variant="secondary" size="sm" onClick={resumeSaved}>Resume &rarr;</Button>
        </div>
      ) : null}
      <h1>Build a practice quiz</h1>
      <p className="mt-1 text-[15px] text-muted font-body">Select the lectures you want to be quizzed on.</p>

      {moduleList.length === 0 ? (
        <p className="mt-6 rounded-[var(--radius-control)] border border-hairline bg-surface-card px-4 py-6 text-center text-[14px] text-muted font-body">
          No published, parsed lectures are available yet.
        </p>
      ) : (
        <div ref={treeRef} className="mt-6 space-y-4" onKeyDown={handleTreeKeyDown}>
          {moduleList.map((m) => {
            const lectureIds = m.lectures.map((l) => l.id);
            const selectedInModule = lectureIds.filter((id) => selected.has(id));
            const allSelected = selectedInModule.length === lectureIds.length;
            const indeterminate = selectedInModule.length > 0 && !allSelected;

            return (
              <div key={m.id} className="rounded-[var(--radius-card)] border border-hairline bg-surface-card p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = indeterminate;
                    }}
                    onChange={() => toggleModule(lectureIds, allSelected)}
                    className="size-4 accent-[var(--color-button-primary)]"
                  />
                  <span className="text-[15px] font-medium font-body text-ink">{m.name}</span>
                </label>
                <div className="mt-2 ml-7 space-y-1.5">
                  {[...m.lectures].sort((a, b) => a.orderIndex - b.orderIndex).map((l) => (
                    <label key={l.id} className={cn("flex items-center gap-3")}>
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={() => toggleLecture(l.id)}
                        className="size-4 accent-[var(--color-button-primary)]"
                      />
                      <span className="text-[14px] text-body font-body">{l.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-[13px] text-muted font-body">
          {selectedCount === 0 ? "Select at least one lecture" : `${selectedCount} ${selectedCount === 1 ? "lecture" : "lectures"} selected`}
        </p>
        <Button
          variant="primary"
          disabled={selectedCount === 0}
          disabledReason="Select at least one lecture"
          onClick={generate}
        >
          Generate quiz
        </Button>
      </div>
    </div>
  );
}
