"use client";

import * as React from "react";
import { CheckCircle, FileText } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { AnchorKind, WizardAnchor } from "./types";

const LABELS: Record<AnchorKind, { title: string; hint: string }> = {
  textbook: { title: "Course textbook", hint: "PDF — used to ground generated content and citations" },
  problem_bank: { title: "Homework / quiz problem bank", hint: "PDF — optional, scoped to this module" },
};

/** Single-file variant of the deck dropzone, reused for the two optional Knowledge Base
 * Anchors slots (Screen 8, Stage 1). Shows an "already attached" state when resuming a
 * draft module that already has an anchor of this kind on the server. */
export function KnowledgeAnchorDropzone({
  kind,
  anchor,
  disabled,
  onSelect,
}: {
  kind: AnchorKind;
  anchor: WizardAnchor | null;
  disabled?: boolean;
  onSelect: (file: File) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { title, hint } = LABELS[kind];
  const attached = anchor && (anchor.id || anchor.uploadPhase === "done");

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-control)] border border-dashed p-4 transition-colors",
        attached ? "border-success/40 bg-success/5" : "border-hairline",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-body"
      )}
    >
      {attached ? <CheckCircle className="size-5 shrink-0 text-success" /> : <FileText className="size-5 shrink-0 text-muted" />}
      <div className="min-w-0">
        <p className="text-[14px] font-medium font-body text-ink">{title}</p>
        <p className="truncate text-[12px] text-muted font-body">
          {anchor?.uploadPhase === "uploading"
            ? "Uploading…"
            : anchor?.uploadPhase === "error"
              ? `Upload failed: ${anchor.uploadError ?? "unknown error"}`
              : attached
                ? (anchor?.fileName ?? "Attached")
                : hint}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}
