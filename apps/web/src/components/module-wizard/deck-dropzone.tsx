"use client";

import * as React from "react";
import { UploadSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const ACCEPT = `${PPTX_MIME},application/pdf`;

/** Bulk deck dropzone (Screen 8 Stage 1) — accepts multiple PDF/PPTX files at once, drag-and-drop
 * or file picker, and hands the raw File[] up; the parent (Stage1DetailsUpload) turns each into a
 * lecture row and drives the actual upload via use-deck-upload's uploadFile(). */
export function DeckDropzone({ disabled, onFiles }: { disabled?: boolean; onFiles: (files: File[]) => void }) {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    onFiles(Array.from(fileList));
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] border-2 border-dashed p-8 text-center transition-colors",
        dragOver ? "border-accent-text bg-accent-text/5" : "border-hairline",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-body"
      )}
    >
      <UploadSimple className="size-6 text-muted" />
      <p className="text-[14px] font-medium font-body text-ink">Drop lecture decks here, or click to browse</p>
      <p className="text-[12px] text-muted font-body">PDF or PPTX, up to 100MB each — drop multiple files at once</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}
