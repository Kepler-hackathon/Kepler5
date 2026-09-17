"use client";

import type { ApiSlide } from "./types";

const ASSETS_BASE = process.env.NEXT_PUBLIC_ASSETS_CDN_URL || "/api/assets";

export function SlideStage({ slide }: { slide: ApiSlide }) {
  const imageUrl = slide.imageKey ? `${ASSETS_BASE}/${slide.imageKey}` : null;

  if (imageUrl) {
    return (
      <div className="relative w-full overflow-hidden rounded-[var(--radius-card)] bg-surface-dark">
        <img
          src={imageUrl}
          alt={`Slide ${slide.index != null ? slide.index + 1 : "—"}${slide.isSupplementary ? " (supplementary)" : ""}`}
          className="block w-full h-auto"
          draggable={false}
        />
      </div>
    );
  }

  // Fallback: render extracted text when no image is available yet
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
