"use client";

import * as React from "react";
import { CaretLeft, CaretRight, Diamond } from "@phosphor-icons/react";
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
  prevSlideNumber,
  nextSlideNumber,
  nextIsInterstitial,
}: {
  currentSlide: number;
  totalSlides: number;
  interstitialAfterSlides: number[];
  onSeek: (slide: number) => void;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  prevSlideNumber?: number;
  nextSlideNumber?: number;
  nextIsInterstitial?: boolean;
}) {
  const WINDOW = 3;
  const start = Math.max(1, currentSlide - WINDOW);
  const end = Math.min(totalSlides, currentSlide + WINDOW);
  const tiles = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="flex h-20 shrink-0 items-center justify-between gap-4 border-t border-hairline bg-surface-lowest px-6 py-3">
      {/* Previous button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={onPrev}
        disabled={!canGoPrev}
        aria-label="Previous slide"
        className="shrink-0"
      >
        <CaretLeft className="size-4" />
        {prevSlideNumber != null ? (
          <span className="hidden sm:inline">Slide {prevSlideNumber}</span>
        ) : (
          <span className="hidden sm:inline">Prev</span>
        )}
      </Button>

      {/* Thumbnail strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto px-1 py-1">
        {tiles.map((n) => {
          const isActive = n === currentSlide;
          const isInterstitial = interstitialAfterSlides.includes(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onSeek(n)}
              aria-label={`Go to slide ${n}`}
              className={
                isActive
                  ? "relative flex h-13 w-20 shrink-0 flex-col items-center justify-center rounded-lg bg-surface-lowest p-1 ring-2 ring-button-primary shadow-sm transition-transform"
                  : "flex h-12 w-16 shrink-0 flex-col items-center justify-center rounded-md bg-surface-card p-1 transition-transform hover:-translate-y-0.5 hover:bg-surface-cream-strong"
              }
            >
              {isActive && (
                <span className="absolute -top-2 rounded-full bg-button-primary px-1.5 py-px text-[9px] font-bold font-body text-on-primary tracking-tight">
                  NOW
                </span>
              )}
              <span
                className={
                  isActive
                    ? "text-[12px] font-bold font-headline text-accent-text mt-1"
                    : "text-[10px] font-semibold font-body text-muted"
                }
              >
                {n}
              </span>
              <span
                className={
                  isActive
                    ? "mt-0.5 h-1 w-12 rounded-full bg-primary-fixed-dim"
                    : "mt-1 h-1 w-8 rounded-full bg-outline-variant/60"
                }
              />
              {isInterstitial && (
                <Diamond className="absolute -right-1 -top-1.5 size-3 text-accent-text" weight="fill" />
              )}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      <Button
        variant={canGoNext ? "primary" : "secondary"}
        size="sm"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="Next slide"
        className="shrink-0"
      >
        {nextIsInterstitial && <Diamond className="size-3.5" weight="fill" />}
        {nextSlideNumber != null ? (
          <span className="hidden sm:inline">Slide {nextSlideNumber}</span>
        ) : (
          <span className="hidden sm:inline">Next</span>
        )}
        <CaretRight className="size-4" />
      </Button>
    </div>
  );
}
