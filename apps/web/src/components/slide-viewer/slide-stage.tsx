"use client";

import type { ApiSlide } from "./types";

const ASSETS_BASE = process.env.NEXT_PUBLIC_ASSETS_CDN_URL || "/api/assets";

export function SlideStage({ slide }: { slide: ApiSlide }) {
  const imageUrl = slide.imageKey ? `${ASSETS_BASE}/${slide.imageKey}` : null;
  const slideNum = slide.index != null ? slide.index + 1 : "—";
  const isSupp = slide.isSupplementary ? " (supplementary)" : "";

  return (
    <div className="relative w-full max-w-5xl mx-auto bg-surface-lowest rounded-2xl shadow-xl overflow-hidden">
      {/* Decorative blur orb */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary-fixed/20 pointer-events-none blur-3xl" />

      <div className="relative z-10 p-4 md:p-6">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Slide ${slideNum}${isSupp}`}
            className="block w-full h-auto rounded-[var(--radius-card)]"
            draggable={false}
          />
        ) : (
          <div className="flex flex-col justify-center py-10 px-4">
            <p className="text-[13px] font-medium font-body uppercase tracking-[1px] text-accent-text">
              Slide {slideNum}{isSupp}
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
        )}
      </div>
    </div>
  );
}
