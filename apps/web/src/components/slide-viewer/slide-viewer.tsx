"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "@phosphor-icons/react";
import { TopBar } from "./top-bar";
import { SlideStage } from "./slide-stage";
import { Scrubber } from "./scrubber";
import { QuizInterstitial, type QuizAnswer } from "./quiz-interstitial";
import { Sidebar } from "./sidebar";
import { RemediationDrawer } from "@/components/remediation/remediation-drawer";
import { PresenterMode } from "@/components/presenter/presenter-mode";
import { Button } from "@/components/ui/button";
import { apiJson, ApiError } from "@/lib/api-client";
import type { QuizQuestion } from "@/lib/data/types";
import type { ApiSlide, ApiLectureItem, Bundle, QuizContent } from "./types";

interface ApiLecture {
  id: string;
  moduleId: string;
  title: string;
  orderIndex: number;
}
interface ApiModule {
  id: string;
  courseId: string;
  name: string;
}

type Stop =
  | { kind: "slide"; slide: ApiSlide }
  | { kind: "quiz"; item: ApiLectureItem; question: QuizQuestion }
  | { kind: "complete" };

function toQuizQuestion(item: ApiLectureItem): QuizQuestion | null {
  const content = item.content as QuizContent | null;
  if (!content?.promptMd || !content.options) return null;
  return {
    id: item.id,
    prompt: content.promptMd,
    correctExplanation: content.explanationMd ?? "",
    options: content.options.map((o) => ({
      id: o.key,
      text: o.text,
      correct: o.key === content.correctKey,
    })),
  };
}

function buildStops(slides: ApiSlide[], items: ApiLectureItem[]): Stop[] {
  const visible = slides.filter((s) => !s.isSupplementary).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const quizByAfterSlide = new Map<string, ApiLectureItem[]>();
  for (const item of items) {
    if (item.kind !== "quiz") continue;
    const list = quizByAfterSlide.get(item.afterSlideId) ?? [];
    list.push(item);
    quizByAfterSlide.set(item.afterSlideId, list);
  }

  const stops: Stop[] = [];
  for (const slide of visible) {
    stops.push({ kind: "slide", slide });
    for (const item of quizByAfterSlide.get(slide.id) ?? []) {
      const question = toQuizQuestion(item);
      if (question) stops.push({ kind: "quiz", item, question });
    }
  }
  stops.push({ kind: "complete" });
  return stops;
}

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

export function SlideViewer({ lectureId, initialSlide }: { lectureId: string; initialSlide: number }) {
  const router = useRouter();
  const [lecture, setLecture] = React.useState<ApiLecture | null>(null);
  const [module, setModule] = React.useState<ApiModule | null>(null);
  const [bundle, setBundle] = React.useState<Bundle | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [quizAnswers, setQuizAnswers] = React.useState<Record<string, QuizAnswer>>({});
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerSlideLabel, setDrawerSlideLabel] = React.useState("");
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [presenting, setPresenting] = React.useState(false);
  const [stopIndex, setStopIndex] = React.useState(0);
  const [explanationPending, setExplanationPending] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    apiJson<ApiLecture>(`/api/lectures/${lectureId}`)
      .then((l) => {
        if (cancelled) return;
        setLecture(l);
        return apiJson<ApiModule>(`/api/modules/${l.moduleId}`).then((m) => !cancelled && setModule(m));
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : "Failed to load lecture"));
    apiJson<Bundle>(`/api/lectures/${lectureId}/bundle`)
      .then((b) => !cancelled && setBundle(b))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : "Failed to load slides"));
    return () => {
      cancelled = true;
    };
  }, [lectureId]);

  const stops = React.useMemo(() => (bundle ? buildStops(bundle.slides, bundle.items) : []), [bundle]);

  React.useEffect(() => {
    if (!stops.length) return;
    const idx = stops.findIndex((s) => s.kind === "slide" && (s.slide.index ?? 0) + 1 === initialSlide);
    setStopIndex(Math.max(0, idx));
    // Only recompute the initial position once stops first become available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops.length > 0]);

  const stop = stops[stopIndex];
  const totalSlides = bundle ? bundle.slides.filter((s) => !s.isSupplementary).length : 0;

  const currentSlideNumber = stop?.kind === "slide" ? (stop.slide.index ?? 0) + 1 : totalSlides;

  React.useEffect(() => {
    if (stop?.kind === "slide") {
      router.replace(`?slide=${(stop.slide.index ?? 0) + 1}`, { scroll: false });
    }
  }, [stop, router]);

  const canGoPrev = stopIndex > 0;
  const canGoNext = stopIndex < stops.length - 1;

  const goTo = React.useCallback((index: number) => setStopIndex(Math.min(stops.length - 1, Math.max(0, index))), [stops.length]);
  const goNext = React.useCallback(() => goTo(stopIndex + 1), [goTo, stopIndex]);
  const goPrev = React.useCallback(() => goTo(stopIndex - 1), [goTo, stopIndex]);
  const seekToSlide = React.useCallback(
    (slideNumber: number) => {
      const idx = stops.findIndex((s) => s.kind === "slide" && (s.slide.index ?? 0) + 1 === slideNumber);
      if (idx >= 0) goTo(idx);
    },
    [stops, goTo]
  );

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); goPrev(); }
      else if (e.key === "Home") { e.preventDefault(); goTo(0); }
      else if (e.key === "End") { e.preventDefault(); goTo(stops.length - 1); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, goTo, stops.length]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-canvas text-center">
        <h2 className="text-[24px]">Couldn&rsquo;t load this lecture</h2>
        <p className="text-[15px] text-muted font-body">{error}</p>
      </div>
    );
  }

  if (!bundle || !lecture || !stop) {
    return (
      <div className="flex h-screen flex-col bg-canvas">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-hairline px-6">
          <div className="size-8 animate-pulse rounded bg-hairline/70" />
          <div className="space-y-1.5">
            <div className="h-3 w-48 animate-pulse rounded bg-hairline/70" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="aspect-[16/9] w-full max-w-3xl animate-pulse rounded-[var(--radius-card)] bg-hairline/70" />
        </div>
      </div>
    );
  }

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
        courseId={module?.courseId ?? ""}
        moduleId={lecture.moduleId}
        lectureNumber={lecture.orderIndex}
        lectureTitle={lecture.title}
        moduleTitle={module?.name ?? ""}
        counterLabel={
          stop.kind === "slide"
            ? `Slide ${currentSlideNumber} of ${totalSlides}`
            : stop.kind === "quiz"
              ? "Practice question"
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
            ) : stop.kind === "quiz" ? (
              <QuizInterstitial
                question={stop.question}
                previousAnswer={quizAnswers[stop.question.id] ?? null}
                onAnswer={(answer) => handleAnswer(stop.question.id, answer, `Slide ${currentSlideNumber}`)}
                onContinue={goNext}
                onSkip={goNext}
                onViewExplanation={() => {
                  setDrawerSlideLabel(`Slide ${currentSlideNumber}`);
                  setDrawerOpen(true);
                }}
                explanationLoading={explanationPending}
              />
            ) : (
              <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-4 text-center">
                <h2>Lecture complete</h2>
                <p className="text-[15px] text-muted font-body">
                  You&rsquo;ve reached the end of {lecture.title}.
                </p>
                <Button asChild variant="primary">
                  <Link href={`/course/${module?.courseId ?? ""}/module/${lecture.moduleId}`}>Back to module</Link>
                </Button>
              </div>
            )}
          </div>
          <Scrubber
            currentSlide={currentSlideNumber}
            totalSlides={Math.max(1, totalSlides)}
            interstitialAfterSlides={[]}
            onSeek={seekToSlide}
            onPrev={goPrev}
            onNext={goNext}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
          />
        </div>

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
            {/* Real FAQ threads for this slide/lecture are wired separately (forum feature area). */}
            <Sidebar slideNumber={currentSlideNumber} lectureNumber={lecture.orderIndex} faqThreads={[]} />
          </div>
        </div>
      </div>

      <RemediationDrawer open={drawerOpen} onOpenChange={setDrawerOpen} slideLabel={drawerSlideLabel} onLoadingChange={setExplanationPending} />

      {presenting ? (
        <PresenterMode
          lectureId={lectureId}
          lectureTitle={lecture.title}
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
