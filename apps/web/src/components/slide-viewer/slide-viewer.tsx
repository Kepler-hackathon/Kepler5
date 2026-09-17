"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "@phosphor-icons/react";
import { course } from "@/lib/data/lecture-8";
import type { Interstitial, Lecture, Slide } from "@/lib/data/types";
import { TopBar } from "./top-bar";
import { SlideStage } from "./slide-stage";
import { Scrubber } from "./scrubber";
import { QuizInterstitial, type QuizAnswer } from "./quiz-interstitial";
import { Sidebar } from "./sidebar";
import { RemediationDrawer } from "@/components/remediation/remediation-drawer";
import { PresenterMode } from "@/components/presenter/presenter-mode";
import { Button } from "@/components/ui/button";

type Stop =
  | { kind: "slide"; slide: Slide }
  | { kind: "interstitial"; interstitial: Interstitial }
  | { kind: "complete" };

function buildStops(lecture: Lecture): Stop[] {
  const stops: Stop[] = [];
  for (const slide of lecture.slides) {
    stops.push({ kind: "slide", slide });
    const interstitial = lecture.interstitials.find((i) => i.afterSlide === slide.number);
    if (interstitial) stops.push({ kind: "interstitial", interstitial });
  }
  stops.push({ kind: "complete" });
  return stops;
}

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

export function SlideViewer({ lecture, initialSlide }: { lecture: Lecture; initialSlide: number }) {
  const router = useRouter();
  // Keyed on lecture.id (a stable primitive), not `lecture` itself: props crossing the
  // Server->Client boundary deserialize into a new object reference on every re-render
  // even when unchanged, so memoizing on the object would recompute every time router
  // .replace() below triggers a re-render — a self-sustaining loop back into itself.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional, see comment above
  const stops = React.useMemo(() => buildStops(lecture), [lecture.id]);
  const initialIndex = Math.max(
    0,
    stops.findIndex((s) => s.kind === "slide" && s.slide.number === initialSlide)
  );
  const [stopIndex, setStopIndex] = React.useState(initialIndex);
  const [quizAnswers, setQuizAnswers] = React.useState<Record<string, QuizAnswer>>({});
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerSlideLabel, setDrawerSlideLabel] = React.useState("");
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [presenting, setPresenting] = React.useState(false);

  const stop = stops[stopIndex];

  const currentSlideNumber =
    stop.kind === "slide" ? stop.slide.number : stop.kind === "interstitial" ? stop.interstitial.afterSlide : lecture.totalSlides;

  // Place-keeping: reflect the current slide in the URL without flooding history (frontend plan §5.3).
  React.useEffect(() => {
    if (stop.kind === "slide") {
      router.replace(`?slide=${stop.slide.number}`, { scroll: false });
    }
  }, [stop, router]);

  const canGoPrev = stopIndex > 0;
  const canGoNext = stopIndex < stops.length - 1;

  const goTo = React.useCallback(
    (index: number) => setStopIndex(Math.min(stops.length - 1, Math.max(0, index))),
    [stops.length]
  );

  const goNext = React.useCallback(() => goTo(stopIndex + 1), [goTo, stopIndex]);
  const goPrev = React.useCallback(() => goTo(stopIndex - 1), [goTo, stopIndex]);

  const seekToSlide = React.useCallback(
    (slideNumber: number) => {
      const idx = stops.findIndex((s) => s.kind === "slide" && s.slide.number === slideNumber);
      if (idx >= 0) goTo(idx);
    },
    [stops, goTo]
  );

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(stops.length - 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, goTo, stops.length]);

  function handleAnswer(questionId: string, answer: QuizAnswer, slideLabel: string) {
    setQuizAnswers((prev) => ({ ...prev, [questionId]: answer }));
    if (!answer.correct) {
      setDrawerSlideLabel(slideLabel);
      setDrawerOpen(true);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-canvas">
      <TopBar
        courseId={lecture.courseId}
        lectureNumber={lecture.number}
        lectureTitle={lecture.title}
        moduleTitle={`${course.code} · ${lecture.moduleTitle}`}
        counterLabel={
          stop.kind === "slide"
            ? `Slide ${stop.slide.number} of ${lecture.totalSlides}`
            : stop.kind === "interstitial"
              ? `After Slide ${stop.interstitial.afterSlide} · Practice question`
              : "Lecture complete"
        }
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen((f) => !f)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onPresent={() => setPresenting(true)}
      />

      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:w-[70%] xl:flex-none">
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {stop.kind === "slide" ? (
              <SlideStage slide={stop.slide} />
            ) : stop.kind === "interstitial" ? (
              <QuizInterstitial
                question={stop.interstitial.question}
                previousAnswer={quizAnswers[stop.interstitial.question.id] ?? null}
                onAnswer={(answer) =>
                  handleAnswer(stop.interstitial.question.id, answer, `Slide ${stop.interstitial.afterSlide}`)
                }
                onContinue={goNext}
                onSkip={goNext}
                onViewExplanation={() => {
                  setDrawerSlideLabel(`Slide ${stop.interstitial.afterSlide}`);
                  setDrawerOpen(true);
                }}
              />
            ) : (
              <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-4 text-center">
                <h2>Lecture complete</h2>
                <p className="text-[15px] text-muted font-body">
                  You&rsquo;ve reached the end of Lecture {lecture.number} · {lecture.title}.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="secondary" onClick={() => alert("Not available in this preview.")}>
                    Back to module
                  </Button>
                  <Button variant="secondary" onClick={() => alert("Not available in this preview.")}>
                    Build a quiz from this lecture
                  </Button>
                  <Button variant="primary" onClick={() => alert("Not available in this preview.")}>
                    Next lecture
                  </Button>
                </div>
              </div>
            )}
          </div>
          <Scrubber
            currentSlide={currentSlideNumber}
            totalSlides={lecture.totalSlides}
            interstitialAfterSlides={lecture.interstitials.map((i) => i.afterSlide)}
            onSeek={seekToSlide}
            onPrev={goPrev}
            onNext={goNext}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
          />
        </div>

        {/* Sidebar: inline at xl+, slide-over overlay below it (frontend plan §4). */}
        <div
          className={`fixed inset-y-0 right-0 z-30 w-full max-w-sm border-l border-hairline bg-canvas shadow-2xl transition-transform duration-200 xl:static xl:z-auto xl:w-[30%] xl:max-w-none xl:translate-x-0 xl:shadow-none ${
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3 xl:hidden">
            <span className="text-[14px] font-medium font-body text-ink">Help</span>
            <button onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" className="text-muted hover:text-ink">
              <X className="size-5" />
            </button>
          </div>
          <div className="h-[calc(100%-49px)] xl:h-full">
            <Sidebar slideNumber={currentSlideNumber} lectureNumber={lecture.number} faqThreads={lecture.faqThreads} />
          </div>
        </div>
      </div>

      <RemediationDrawer open={drawerOpen} onOpenChange={setDrawerOpen} slideLabel={drawerSlideLabel} />

      {presenting ? (
        <PresenterMode
          lecture={lecture}
          initialSlideNumber={currentSlideNumber}
          onExit={(exitSlideNumber) => {
            setPresenting(false);
            seekToSlide(exitSlideNumber);
          }}
        />
      ) : null}
    </div>
  );
}
