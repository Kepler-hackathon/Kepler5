"use client";

import type { ApiSlide } from "./types";

// Real slide content is raw text extracted by deck-parser (workers/deck-parser/handler.py)
// via python-pptx/PyMuPDF — there's no AI restructuring step producing the polished
// {title, bullets, code, takeaway} shape the original mock UI assumed, and no rendered
// slide image pipeline (imageKey/thumbKey are never populated). Render the text directly.
export function SlideStage({ slide }: { slide: ApiSlide }) {
  return (
    <div className="flex h-full flex-col justify-center rounded-[var(--radius-card)] bg-canvas px-10 py-10 sm:px-14">
      <p className="text-[13px] font-medium font-body uppercase tracking-[1px] text-accent-text">
        Slide {slide.index != null ? slide.index + 1 : "—"}
        {slide.isSupplementary ? " (supplementary)" : ""}
      </p>

      <div className="mt-6 max-w-2xl whitespace-pre-wrap text-[17px] leading-relaxed text-body font-body">
        {slide.text?.trim() || <span className="text-muted">(no extracted text on this slide)</span>}
      </div>

      {slide.notes ? (
        <div className="mt-6 max-w-2xl rounded-[var(--radius-control)] border border-hairline bg-surface-card px-4 py-3 text-[13px] leading-relaxed text-body font-body">
          <p className="mb-1 text-[11px] font-medium font-body uppercase tracking-[0.5px] text-muted">Notes</p>
          {slide.notes}
        </div>
      ) : null}
    </div>
  );
}
