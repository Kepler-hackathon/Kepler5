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
    questionId: item.questionId ?? null,
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

interface ApiProgress {
  lectureId: string;
  maxSlideIndex: number;
}

export function SlideViewer({ lectureId, initialSlide }: { lectureId: string; initialSlide: number | null }) {
  const router = useRouter();
  const [lecture, setLecture] = React.useState<ApiLecture | null>(null);
  const [module, setModule] = React.useState<ApiModule | null>(null);
  const [bundle, setBundle] = React.useState<Bundle | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [resumeSlide, setResumeSlide] = React.useState<number | null>(null);

  const [quizAnswers, setQuizAnswers] = React.useState<Record<string, QuizAnswer>>({});
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerSlideLabel, setDrawerSlideLabel] = React.useState("");
  const [drawerQuestion, setDrawerQuestion] = React.useState<QuizQuestion | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [presenting, setPresenting] = React.useState(false);
  const [stopIndex, setStopIndex] = React.useState(0);
  const [explanationPending, setExplanationPending] = React.useState(false);

  const wrongAnswerOption = React.useMemo(() => {
    if (!drawerQuestion) return null;
    const answer = quizAnswers[drawerQuestion.id];
    if (!answer || answer.correct) return null;
    const chosen = drawerQuestion.options.find((o) => o.id === answer.optionId);
    return chosen ? { key: chosen.id, text: chosen.text } : null;
  }, [drawerQuestion, quizAnswers]);

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
    // No ?slide= in the URL — this is "Start"/"Resume Lecture", not a deep link, so look up
    // where the student last left off instead of always opening at slide 1. GET /api/progress
    // has no per-lecture filter, so fetch the full list and pick this lecture's row.
    if (initialSlide === null) {
      apiJson<ApiProgress[]>("/api/progress")
        .then((rows) => {
          if (cancelled) return;
          const row = rows.find((r) => r.lectureId === lectureId);
          if (row) setResumeSlide(row.maxSlideIndex + 1);
        })
        .catch(() => {
          // Resuming is a nice-to-have — fall through to starting at slide 1.
        });
    }
    return () => {
      cancelled = true;
    };
  }, [lectureId, initialSlide]);

  const stops = React.useMemo(() => (bundle ? buildStops(bundle.slides, bundle.items) : []), [bundle]);
  const interstitialSlideNumbers = React.useMemo(() => {
    if (!bundle) return [];
    const slideById = new Map(bundle.slides.map(s => [s.id, s]));
    return bundle.items
      .filter(item => item.kind === 'quiz' && item.afterSlideId)
      .map(item => {
        const slide = slideById.get(item.afterSlideId);
        return slide ? (slide.index ?? 0) + 1 : null;
      })
      .filter((n): n is number => n !== null);
  }, [bundle]);
  const targetSlide = initialSlide ?? resumeSlide ?? 1;

  React.useEffect(() => {
    if (!stops.length) return;
    const idx = stops.findIndex((s) => s.kind === "slide" && (s.slide.index ?? 0) + 1 === targetSlide);
    setStopIndex(Math.max(0, idx));
    // Recompute once stops first become available, and again if a resume lookup resolves
    // after that (targetSlide starts at 1 and may jump once /api/progress responds).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops.length > 0, targetSlide]);

  const stop = stops[stopIndex];
  const totalSlides = bundle ? bundle.slides.filter((s) => !s.isSupplementary).length : 0;

  // A quiz/complete stop has no slide of its own — it's anchored after a slide, not at
  // totalSlides. Scan backward for the nearest preceding "slide" stop so the scrubber tracks
  // where the interstitial actually sits in the lecture instead of jumping to the end.
  const nearestSlideStop = React.useMemo(() => {
    // stops can be [] (still loading) while stopIndex hasn't caught up yet, or stopIndex can
    // momentarily point past the end of a freshly-recomputed stops array — stops[i] is safely
    // undefined in either case, same as the `stop?.kind` optional chaining this replaced.
    for (let i = Math.min(stopIndex, stops.length - 1); i >= 0; i--) {
      const s = stops[i];
      if (s?.kind === "slide") return s.slide;
    }
    return null;
  }, [stops, stopIndex]);
  const currentSlideNumber = nearestSlideStop ? (nearestSlideStop.index ?? 0) + 1 : totalSlides;
  const currentSlideId = nearestSlideStop?.id ?? null;

  React.useEffect(() => {
    if (stop?.kind === "slide") {
      router.replace(`?slide=${(stop.slide.index ?? 0) + 1}`, { scroll: false });
    }
  }, [stop, router]);

  // Record how far the student has gotten, so "Resume"/"Start Lecture" picks up where they
  // left off (see the /api/progress lookup above) instead of always restarting at slide 1.
  React.useEffect(() => {
    if (!currentSlideId) return;
    apiJson(`/api/progress/${lectureId}`, {
      method: "PUT",
      body: JSON.stringify({ lastSlideId: currentSlideId, slideIndex: currentSlideNumber }),
    }).catch(() => {
      // Best-effort — a failed progress write shouldn't interrupt viewing.
    });
  }, [lectureId, currentSlideId, currentSlideNumber]);

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

  // Must be before any early return — Rules of Hooks
  const prevSlideStop = React.useMemo(() => {
    for (let i = stopIndex - 1; i >= 0; i--) {
      if (stops[i]?.kind === "slide") return stops[i] as { kind: "slide"; slide: ApiSlide };
    }
    return null;
  }, [stops, stopIndex]);
  const nextStop = stops[stopIndex + 1];
  const nextSlideStop = React.useMemo(() => {
    for (let i = stopIndex + 1; i < stops.length; i++) {
      if (stops[i]?.kind === "slide") return stops[i] as { kind: "slide"; slide: ApiSlide };
    }
    return null;
  }, [stops, stopIndex]);
  const prevSlideNumber = prevSlideStop ? (prevSlideStop.slide.index ?? 0) + 1 : undefined;
  const nextSlideNumber = nextSlideStop ? (nextSlideStop.slide.index ?? 0) + 1 : undefined;
  const nextIsInterstitial = nextStop?.kind === "quiz";

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

  function handleAnswer(question: QuizQuestion, answer: QuizAnswer, slideLabel: string) {
    setQuizAnswers((prev) => ({ ...prev, [question.id]: answer }));
    if (!answer.correct) {
      setDrawerSlideLabel(slideLabel);
      setDrawerQuestion(question);
      setDrawerOpen(true);
    }
    // Persist to DB so analytics heatmap reflects real quiz performance
    const qid = question.questionId ?? question.id;
    apiJson(`/api/questions/${qid}/answer`, {
      method: "POST",
      body: JSON.stringify({ selectedKey: answer.optionId }),
    }).catch(() => {});
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
        totalSlides={totalSlides}
        currentSlide={currentSlideNumber}
      />

      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:w-[70%] lg:flex-none">
          <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-7 flex items-center justify-center">
            {stop.kind === "slide" ? (
              <SlideStage slide={stop.slide} />
            ) : stop.kind === "quiz" ? (
              <QuizInterstitial
                question={stop.question}
                previousAnswer={quizAnswers[stop.question.id] ?? null}
                onAnswer={(answer) => handleAnswer(stop.question, answer, `Slide ${currentSlideNumber}`)}
                onContinue={goNext}
                onSkip={goNext}
                onViewExplanation={() => {
                  setDrawerSlideLabel(`Slide ${currentSlideNumber}`);
                  setDrawerQuestion(stop.question);
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
            interstitialAfterSlides={interstitialSlideNumbers}
            onSeek={seekToSlide}
            onPrev={goPrev}
            onNext={goNext}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            prevSlideNumber={prevSlideNumber}
            nextSlideNumber={nextSlideNumber}
            nextIsInterstitial={nextIsInterstitial}
          />
        </div>

        <div
          className={`fixed inset-y-0 right-0 z-30 w-full max-w-sm border-l border-hairline bg-canvas shadow-2xl transition-transform duration-200 lg:static lg:z-auto lg:w-[30%] lg:max-w-none lg:translate-x-0 lg:shadow-none ${
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3 lg:hidden">
            <span className="text-[14px] font-medium font-body text-ink">Help</span>
            <button onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" className="text-muted hover:text-ink">
              <X className="size-5" />
            </button>
          </div>
          <div className="h-[calc(100%-49px)] lg:h-full">
            <Sidebar
              slideNumber={currentSlideNumber}
              lectureNumber={lecture.orderIndex}
              moduleId={lecture.moduleId}
              lectureId={lectureId}
              slideId={currentSlideId}
            />
          </div>
        </div>
      </div>

      <RemediationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        slideLabel={drawerSlideLabel}
        question={drawerQuestion}
        wrongAnswerOption={wrongAnswerOption}
        onLoadingChange={setExplanationPending}
      />

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
