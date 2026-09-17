"use client";

import * as React from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function Scrubber({
  currentSlide,
  totalSlides,
  interstitialAfterSlides,
  onSeek,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
}: {
  currentSlide: number;
  totalSlides: number;
  interstitialAfterSlides: number[];
  onSeek: (slide: number) => void;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}) {
  const trackRef = React.useRef<HTMLDivElement>(null);

  function seekFromClientX(clientX: number) {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const slide = Math.round(ratio * (totalSlides - 1)) + 1;
    onSeek(slide);
  }

  return (
    <div className="flex items-center gap-4 border-t border-hairline bg-canvas px-6 py-4">
      <Button variant="secondary" size="sm" onClick={onPrev} disabled={!canGoPrev} aria-label="Previous slide">
        <CaretLeft className="size-4" /> Previous
      </Button>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Slide position"
        aria-valuemin={1}
        aria-valuemax={totalSlides}
        aria-valuenow={currentSlide}
        aria-valuetext={`Slide ${currentSlide} of ${totalSlides}`}
        onClick={(e) => seekFromClientX(e.clientX)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") onSeek(Math.min(totalSlides, currentSlide + 1));
          if (e.key === "ArrowLeft") onSeek(Math.max(1, currentSlide - 1));
        }}
        className="relative h-6 flex-1 cursor-pointer"
      >
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-hairline" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-button-primary transition-[width] duration-150"
          style={{ width: `${((currentSlide - 1) / (totalSlides - 1)) * 100}%` }}
        />
        {interstitialAfterSlides.map((afterSlide) => (
          <span
            key={afterSlide}
            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-amber-fill"
            style={{ left: `${(afterSlide / (totalSlides - 1)) * 100}%` }}
            title={`Interactive interstitial after slide ${afterSlide}`}
          />
        ))}
        <span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas bg-button-primary shadow"
          style={{ left: `${((currentSlide - 1) / (totalSlides - 1)) * 100}%` }}
        />
      </div>

      <Button variant="secondary" size="sm" onClick={onNext} disabled={!canGoNext} aria-label="Next slide">
        Next <CaretRight className="size-4" />
      </Button>
    </div>
  );
}
