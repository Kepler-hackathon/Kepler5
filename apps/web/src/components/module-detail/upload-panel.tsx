"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { apiJson, ApiError } from "@/lib/api-client";
import type { ApiLecture } from "./types";

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

interface ProcessingStatus {
  status: string;
  lectures: Array<{ lectureId: string; parseStatus: string; genStatus: string; parseError: string | null }>;
}

/** Teacher-only: upload a real deck, attach it as a new lecture, and trigger the real
 * deck-parser + generation pipeline (POST /api/uploads → S3 PUT → complete → attach → process). */
export function UploadPanel({
  moduleId,
  existingLectures,
  onDone,
}: {
  moduleId: string;
  existingLectures: ApiLecture[];
  onDone: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [message, setMessage] = React.useState<string | null>(null);
  const pollRef = React.useRef<number | null>(null);

  React.useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

  function pollProcessing(runModuleId: string) {
    pollRef.current = window.setInterval(async () => {
      try {
        const status = await apiJson<ProcessingStatus>(`/api/modules/${runModuleId}/processing`);
        const terminal = ["done", "failed", "skipped"].includes(status.status);
        setMessage(`Processing: ${status.status}`);
        if (terminal) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          setPhase(status.status === "failed" ? "error" : "done");
          onDone();
        }
      } catch {
        // transient poll error — keep trying until the interval is cleared
      }
    }, 2000);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setPhase("uploading");
    setMessage("Requesting upload URL…");
    try {
      const { fileId, uploadUrl } = await apiJson<{ fileId: string; uploadUrl: string }>("/api/uploads", {
        method: "POST",
        body: JSON.stringify({ kind: "deck", mime: file.type, name: file.name, size: file.size }),
      });

      setMessage("Uploading to S3…");
      const putRes = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putRes.ok) throw new Error(`S3 upload failed (${putRes.status})`);

      setMessage("Confirming upload…");
      await apiJson(`/api/uploads/${fileId}/complete`, {
        method: "POST",
        body: JSON.stringify({ moduleId }),
      });

      setMessage("Attaching to lecture…");
      const lectureBody = [
        ...existingLectures.map((l) => ({ lectureId: l.id, fileId: l.deckFileId ?? undefined, title: l.title })),
        { fileId, title: title.trim() },
      ];
      await apiJson(`/api/modules/${moduleId}/lectures`, {
        method: "PUT",
        body: JSON.stringify(lectureBody),
      });

      setMessage("Starting processing…");
      setPhase("processing");
      await apiJson(`/api/modules/${moduleId}/process`, { method: "POST" });
      pollProcessing(moduleId);
    } catch (err) {
      setPhase("error");
      setMessage(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Upload failed");
    }
  }

  const busy = phase === "uploading" || phase === "processing";

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-2 rounded-[var(--radius-control)] border border-hairline bg-surface-card p-4">
      <p className="text-[13px] font-medium font-body uppercase tracking-[0.5px] text-muted">Upload a lecture deck</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lecture title"
          disabled={busy}
          className="min-w-40 flex-1 rounded-[var(--radius-control)] border border-hairline bg-canvas px-3 py-2 text-[14px] font-body"
        />
        <input
          type="file"
          accept={`${PPTX_MIME},application/pdf`}
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-[13px] font-body"
        />
        <Button type="submit" size="sm" disabled={busy || !file || !title.trim()}>
          {busy ? "Working…" : "Upload"}
        </Button>
      </div>
      {message ? <p className="text-[13px] text-muted font-body">{message}</p> : null}
    </form>
  );
}
