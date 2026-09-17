"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { StatusIndicator, type StatusKind } from "@/components/ui/status-indicator";
import { useToast } from "@/components/ui/toast";
import { apiJson, ApiError } from "@/lib/api-client";
import type { ApiProcessingStatus } from "./types";

const TERMINAL = new Set(["done", "failed", "skipped"]);

function stepKind(states: string[]): { kind: StatusKind; label: string } {
  if (states.length === 0) return { kind: "not-started", label: "Pending" };
  if (states.some((s) => s === "failed")) return { kind: "attention", label: "Failed" };
  if (states.every((s) => s === "done" || s === "skipped")) return { kind: "done", label: "Done" };
  if (states.some((s) => s === "running")) return { kind: "in-progress", label: "In progress" };
  return { kind: "not-started", label: "Pending" };
}

/** Screen 8, Stage 3 — full-bleed processing checklist. Kicks off the run if one doesn't
 * already exist (resuming a module that was never started), then polls every 2s, same
 * cadence as the proven module-detail/upload-panel.tsx polling loop. */
export function Stage3Processing({
  moduleId,
  aiOptIn,
  lectureTitles,
  onCancelled,
  onDone,
}: {
  moduleId: string;
  aiOptIn: boolean;
  lectureTitles: Record<string, string>;
  onCancelled: () => void;
  onDone: () => void;
}) {
  const [status, setStatus] = React.useState<ApiProcessingStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [cancelling, setCancelling] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);
  const pollRef = React.useRef<number | null>(null);
  const doneRef = React.useRef(false);
  const toast = useToast();

  const poll = React.useCallback(async () => {
    try {
      const s = await apiJson<ApiProcessingStatus>(`/api/modules/${moduleId}/processing`);
      setStatus(s);
      // Mirrors the backend's own isTerminal() in the processing route: the run status being
      // terminal is sufficient on its own — it's an OR with "every lecture terminal", not an
      // AND. Requiring both (as an earlier version of this check did) can hang forever: a run
      // can finish 'done' while a lecture's row never advances past 'pending' (e.g. an
      // unparseable deck), and there's no way back once the run is no longer active to cancel.
      const lectureTerminal = s.lectures.length > 0 && s.lectures.every((l) => TERMINAL.has(l.parseStatus) && TERMINAL.has(l.genStatus));
      if (TERMINAL.has(s.status) || lectureTerminal) {
        if (pollRef.current) window.clearInterval(pollRef.current);
        if (!doneRef.current) {
          doneRef.current = true;
          const anyFailed = s.status === "failed" || s.lectures.some((l) => l.parseStatus === "failed" || (aiOptIn && l.genStatus === "failed"));
          if (anyFailed) {
            toast.push({ message: "Processing finished with errors — see below" });
          } else {
            onDone();
          }
        }
      }
    } catch {
      // transient poll error — keep trying until the interval is cleared
    }
  }, [moduleId, aiOptIn, onDone, toast]);

  React.useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        await apiJson(`/api/modules/${moduleId}/processing`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          await apiJson(`/api/modules/${moduleId}/process`, { method: "POST" });
        }
      }
      if (cancelled) return;
      await poll();
      pollRef.current = window.setInterval(poll, 2000);
    }
    start().catch((err) => setError(err instanceof ApiError ? err.message : "Failed to start processing"));
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  async function cancel() {
    setCancelling(true);
    try {
      await apiJson(`/api/modules/${moduleId}/processing/cancel`, { method: "POST" });
      if (pollRef.current) window.clearInterval(pollRef.current);
      onCancelled();
    } catch (err) {
      toast.push({ message: err instanceof ApiError ? err.message : "Failed to cancel" });
    } finally {
      setCancelling(false);
    }
  }

  async function retry() {
    setRetrying(true);
    try {
      await apiJson(`/api/modules/${moduleId}/processing/retry`, { method: "POST", body: JSON.stringify({}) });
      doneRef.current = false;
      await poll();
      pollRef.current = window.setInterval(poll, 2000);
    } catch (err) {
      toast.push({ message: err instanceof ApiError ? err.message : "Failed to retry" });
    } finally {
      setRetrying(false);
    }
  }

  const running = status ? !TERMINAL.has(status.status) : true;
  const parseStep = status ? stepKind(status.lectures.map((l) => l.parseStatus)) : stepKind([]);
  const genStep = status ? stepKind(status.lectures.map((l) => l.genStatus)) : stepKind([]);
  const failedLectures = status?.lectures.filter((l) => l.parseStatus === "failed" || (aiOptIn && l.genStatus === "failed")) ?? [];

  if (error) {
    return <p className="text-[14px] text-error font-body">{error}</p>;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-10 text-center">
      <h2 className="text-[22px]">Processing module…</h2>

      <div className="w-full space-y-3 text-left">
        <div className="flex items-center justify-between rounded-[var(--radius-control)] border border-hairline bg-surface-card p-4">
          <span className="text-[14px] font-body text-ink">Parsing lecture decks — extracting text and slide structure</span>
          <StatusIndicator kind={parseStep.kind} label={parseStep.label} />
        </div>
        {aiOptIn ? (
          <div className="flex items-center justify-between rounded-[var(--radius-control)] border border-hairline bg-surface-card p-4">
            <span className="text-[14px] font-body text-ink">Generating mini-quizzes &amp; interactive widgets</span>
            <StatusIndicator kind={genStep.kind} label={genStep.label} />
          </div>
        ) : null}
      </div>

      {failedLectures.length > 0 ? (
        <div className="w-full space-y-2 text-left">
          {failedLectures.map((l) => (
            <p key={l.lectureId} className="text-[13px] text-error font-body">
              {lectureTitles[l.lectureId] ?? "A lecture"}: {l.parseError ?? l.genError ?? "processing failed"}
            </p>
          ))}
          <Button variant="secondary" size="sm" onClick={retry} disabled={retrying}>
            {retrying ? "Retrying…" : "Retry"}
          </Button>
        </div>
      ) : null}

      {running ? (
        <Button variant="ghost" onClick={cancel} disabled={cancelling}>
          {cancelling ? "Cancelling…" : "Cancel"}
        </Button>
      ) : null}
    </div>
  );
}
