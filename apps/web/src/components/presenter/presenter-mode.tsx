"use client";

import * as React from "react";
import { X, CaretDown, CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { SlideStage } from "@/components/slide-viewer/slide-stage";
import type { Lecture } from "@/lib/data/types";

/**
 * Screen 12 — Presenter Mode (frontend plan Part III §3, S12). Iterates `lecture.slides`
 * directly (supplementary slides included, quizzes/widgets excluded per spec) rather than
 * the interleaved `stops` the main viewer uses.
 */
export function PresenterMode({
  lecture,
  initialSlideNumber,
  onExit,
}: {
  lecture: Lecture;
  initialSlideNumber: number;
  onExit: (currentSlideNumber: number) => void;
}) {
  const initialIndex = Math.max(0, lecture.slides.findIndex((s) => s.number === initialSlideNumber));
  const [index, setIndex] = React.useState(initialIndex);
  const [blanked, setBlanked] = React.useState(false);
  const [notesOpen, setNotesOpen] = React.useState(false);
  const [chromeVisible, setChromeVisible] = React.useState(true);
  const hideTimer = React.useRef<number | undefined>(undefined);
  const wakeLockRef = React.useRef<{ release: () => Promise<void> } | null>(null);

  const slide = lecture.slides[index];
  const isFirst = index === 0;
  const isLast = index === lecture.slides.length - 1;

  const goNext = React.useCallback(() => setIndex((i) => Math.min(lecture.slides.length - 1, i + 1)), [lecture.slides.length]);
  const goPrev = React.useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  React.useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((lock) => (wakeLockRef.current = lock)).catch(() => {});
    return () => {
      wakeLockRef.current?.release().catch(() => {});
    };
  }, []);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Home") setIndex(0);
      else if (e.key === "End") setIndex(lecture.slides.length - 1);
      else if (e.key.toLowerCase() === "b") setBlanked((v) => !v);
      else if (e.key.toLowerCase() === "q") onExit(slide.number);
      else if (e.key === "Escape") onExit(slide.number);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, lecture.slides.length, onExit, slide.number]);

  function onMouseMove() {
    setChromeVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setChromeVisible(false), 3000);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas" onMouseMove={onMouseMove}>
      <div
        className={cn(
          "flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-canvas px-6 transition-opacity duration-200",
          !chromeVisible && "pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100"
        )}
      >
        <p className="text-[13px] text-muted font-body">
          {lecture.title} · Slide {index + 1} of {lecture.slides.length}
        </p>
        <div className="flex items-center gap-3">
          {slide.presenterNotes ? (
            <button
              onClick={() => setNotesOpen((v) => !v)}
              className="flex items-center gap-1 text-[13px] font-medium font-body text-muted hover:text-ink"
            >
              Notes {notesOpen ? <CaretUp className="size-3.5" /> : <CaretDown className="size-3.5" />}
            </button>
          ) : null}
          <button
            onClick={() => onExit(slide.number)}
            className="flex items-center gap-1.5 text-[13px] font-medium font-body text-muted hover:text-ink"
          >
            <X className="size-4" /> Exit (Q)
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {blanked ? (
          <div className="flex h-full items-center justify-center bg-surface-dark">
            <p className="text-[13px] text-on-dark-soft font-body">Screen blanked · press B to resume</p>
          </div>
        ) : (
          <SlideStage slide={slide} />
        )}
      </div>

      {slide.presenterNotes && notesOpen ? (
        <div className="shrink-0 border-t border-hairline bg-surface-card px-6 py-4">
          <p className="text-[11px] font-medium font-body uppercase tracking-[0.5px] text-muted">Visible on this screen</p>
          <p className="mt-1 text-[14px] leading-relaxed text-body font-body">{slide.presenterNotes}</p>
        </div>
      ) : null}

      <div
        className={cn(
          "flex h-12 shrink-0 items-center justify-center gap-4 border-t border-hairline bg-canvas transition-opacity duration-200",
          !chromeVisible && "pointer-events-none opacity-0"
        )}
      >
        <button onClick={goPrev} disabled={isFirst} className="text-[13px] font-body text-muted disabled:opacity-30">
          ← Previous
        </button>
        <button onClick={() => setBlanked((v) => !v)} className="text-[13px] font-body text-muted">
          {blanked ? "Resume (B)" : "Blank (B)"}
        </button>
        <button onClick={goNext} disabled={isLast} className="text-[13px] font-body text-muted disabled:opacity-30">
          Next →
        </button>
      </div>
    </div>
  );
}
