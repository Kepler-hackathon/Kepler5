"use client";

import * as React from "react";
import { X, CaretDown, CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { SlideStage } from "@/components/slide-viewer/slide-stage";
import { apiJson, ApiError } from "@/lib/api-client";
import type { ApiSlide } from "@/components/slide-viewer/types";

/** Screen 12 — Presenter Mode. Fetches the teacher-only presenter slide list
 * (GET /api/lectures/[id]/presenter — includes notes) directly. */
export function PresenterMode({
  lectureId,
  lectureTitle,
  initialSlideNumber,
  onExit,
}: {
  lectureId: string;
  lectureTitle: string;
  initialSlideNumber: number;
  onExit: (currentSlideNumber: number) => void;
}) {
  const [slides, setSlides] = React.useState<ApiSlide[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [index, setIndex] = React.useState(0);
  const [blanked, setBlanked] = React.useState(false);
  const [darkSurround, setDarkSurround] = React.useState(false);
  const [notesOpen, setNotesOpen] = React.useState(false);
  const [chromeVisible, setChromeVisible] = React.useState(true);
  const hideTimer = React.useRef<number | undefined>(undefined);
  const wakeLockRef = React.useRef<{ release: () => Promise<void> } | null>(null);

  React.useEffect(() => {
    apiJson<{ slides: ApiSlide[] }>(`/api/lectures/${lectureId}/presenter`)
      .then((data) => {
        setSlides(data.slides);
        const idx = data.slides.findIndex((s) => (s.index ?? 0) + 1 === initialSlideNumber);
        setIndex(Math.max(0, idx));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load presenter slides"));
    // Only load once per mount — initialSlideNumber is a starting point, not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureId]);

  const slide = slides?.[index];
  const isFirst = index === 0;
  const isLast = !!slides && index === slides.length - 1;

  const goNext = React.useCallback(() => setIndex((i) => Math.min((slides?.length ?? 1) - 1, i + 1)), [slides?.length]);
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
      if (!slide) return;
      const exitSlideNumber = (slide.index ?? 0) + 1;
      if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) { e.preventDefault(); goPrev(); }
      else if (e.key === "Home") setIndex(0);
      else if (e.key === "End") setIndex((slides?.length ?? 1) - 1);
      else if (e.key.toLowerCase() === "b") setBlanked((v) => !v);
      else if (e.key.toLowerCase() === "d") setDarkSurround((v) => !v);
      else if (e.key.toLowerCase() === "q") onExit(exitSlideNumber);
      else if (e.key === "Escape") onExit(exitSlideNumber);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, slides?.length, onExit, slide]);

  function onMouseMove() {
    setChromeVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setChromeVisible(false), 3000);
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-canvas text-center">
        <p className="text-[15px] text-muted font-body">{error}</p>
        <button onClick={() => onExit(initialSlideNumber)} className="text-[13px] font-medium font-body text-accent-text">Exit</button>
      </div>
    );
  }

  if (!slide) {
    return <div className="fixed inset-0 z-50 bg-canvas" />;
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
          {lectureTitle} · Slide {index + 1} of {slides?.length ?? "?"}
        </p>
        <div className="flex items-center gap-3">
          {slide.notes ? (
            <button
              onClick={() => setNotesOpen((v) => !v)}
              className="flex items-center gap-1 text-[13px] font-medium font-body text-muted hover:text-ink"
            >
              Notes {notesOpen ? <CaretUp className="size-3.5" /> : <CaretDown className="size-3.5" />}
            </button>
          ) : null}
          <button
            onClick={() => setDarkSurround((v) => !v)}
            className="flex items-center gap-1 text-[13px] font-medium font-body text-muted hover:text-ink"
            title="Toggle dark surround for projectors (D)"
          >
            {darkSurround ? "Light surround" : "Dark surround"}
          </button>
          <button
            onClick={() => onExit((slide.index ?? 0) + 1)}
            className="flex items-center gap-1.5 text-[13px] font-medium font-body text-muted hover:text-ink"
          >
            <X className="size-4" /> Exit (Q)
          </button>
        </div>
      </div>

      <div className={cn("relative flex-1 overflow-hidden", darkSurround && !blanked && "bg-surface-dark")}>
        {blanked ? (
          <div className="flex h-full items-center justify-center bg-surface-dark">
            <p className="text-[13px] text-on-dark-soft font-body">Screen blanked · press B to resume</p>
          </div>
        ) : (
          <div className={cn(darkSurround && "flex h-full items-center justify-center p-8")}>
            <SlideStage slide={slide} />
          </div>
        )}
      </div>

      {slide.notes && notesOpen ? (
        <div className="shrink-0 border-t border-hairline bg-surface-card px-6 py-4">
          <p className="text-[11px] font-medium font-body uppercase tracking-[0.5px] text-muted">Visible on this screen</p>
          <p className="mt-1 text-[14px] leading-relaxed text-body font-body">{slide.notes}</p>
        </div>
      ) : null}

      <div
        className={cn(
          "flex h-12 shrink-0 items-center justify-center gap-6 border-t border-hairline bg-canvas transition-opacity duration-200",
          !chromeVisible && "pointer-events-none opacity-0"
        )}
      >
        <button onClick={goPrev} disabled={isFirst} className="text-[13px] font-body text-muted disabled:opacity-30">← Previous</button>
        <button onClick={() => setBlanked((v) => !v)} className="text-[13px] font-body text-muted">{blanked ? "Resume (B)" : "Blank (B)"}</button>
        <button onClick={() => setDarkSurround((v) => !v)} className="text-[13px] font-body text-muted">{darkSurround ? "Light surround" : "Dark surround (D)"}</button>
        <button onClick={goNext} disabled={isLast} className="text-[13px] font-body text-muted disabled:opacity-30">Next →</button>
      </div>
    </div>
  );
}
