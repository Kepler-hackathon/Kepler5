"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  ChatCircle,
  Code,
  ArrowRight,
  MagnifyingGlass,
  Lightning,
  GearSix,
} from "@phosphor-icons/react";
import { AppNav } from "@/components/nav/app-nav";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SkeletonCard } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "./module-card";
import { FlowView } from "./flow-view";
import { useIdentity } from "@/lib/identity";
import { apiJson, ApiError } from "@/lib/api-client";
import type { ApiModule } from "./types";

interface ApiCourse {
  id: string;
  code: string | null;
  name: string;
  term: string | null;
  instructorName: string | null;
  description: string | null;
  syllabusUrl: string | null;
  textbookTitle: string | null;
  textbookUrl: string | null;
  officeHours: string | null;
  prerequisites: string | null;
}

interface ApiLecture {
  id: string;
  name?: string;
  orderIndex?: number | null;
  progress?: { completedAt: string | null; startedAt?: string | null } | null;
}

interface ApiThread {
  id: string;
  question: string;
  createdAt?: string;
  answerCount?: number;
  upvotes?: number;
}

export function CourseLanding({ courseId }: { courseId: string }) {
  const identity = useIdentity();
  const [course, setCourse] = React.useState<ApiCourse | null>(null);
  const [modules, setModules] = React.useState<ApiModule[] | null>(null);
  const [reviewPendingCount, setReviewPendingCount] = React.useState<number | undefined>(undefined);
  const [error, setError] = React.useState<string | null>(null);
  const [view, setView] = React.useState<"grid" | "flow">("grid");
  const [lectureStats, setLectureStats] = React.useState<{ total: number; completed: number } | null>(null);
  const [openQuestionCount, setOpenQuestionCount] = React.useState<number>(0);
  const [inProgressLecture, setInProgressLecture] = React.useState<(ApiLecture & { moduleId: string }) | null>(null);
  const [lectureCounts, setLectureCounts] = React.useState<Record<string, number>>({});
  const [threads, setThreads] = React.useState<ApiThread[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");

  const load = React.useCallback(() => {
    setError(null);
    Promise.all([
      apiJson<ApiCourse>(`/api/courses/${courseId}`),
      apiJson<{ modules: ApiModule[]; reviewPendingCount?: number }>(`/api/course?courseId=${courseId}`),
    ])
      .then(async ([foundCourse, moduleData]) => {
        setCourse(foundCourse ?? null);
        setModules(moduleData.modules);
        setReviewPendingCount(moduleData.reviewPendingCount);

        const published = moduleData.modules.filter((m) => m.status === "published");
        if (published.length > 0) {
          const allLectureArrays = await Promise.all(
            published.map((m) =>
              apiJson<ApiLecture[]>(`/api/modules/${m.id}/lectures`)
                .then((lecs) => lecs.map((l) => ({ ...l, moduleId: m.id })))
                .catch(() => [] as (ApiLecture & { moduleId: string })[])
            )
          );
          const allLectures = allLectureArrays.flat();
          setLectureStats({
            total: allLectures.length,
            completed: allLectures.filter((l) => l.progress?.completedAt).length,
          });

          // Per-module lecture counts
          const counts: Record<string, number> = {};
          for (const lec of allLectures) {
            counts[lec.moduleId] = (counts[lec.moduleId] ?? 0) + 1;
          }
          setLectureCounts(counts);

          // In-progress: has progress record but not yet completed
          const inProgress = allLectures.find((l) => l.progress && !l.progress.completedAt) ?? null;
          setInProgressLecture(inProgress);
        }

        apiJson<{ threads: ApiThread[] }>(`/api/faq/threads?limit=50`)
          .then((d) => {
            setThreads(d.threads);
            setOpenQuestionCount(d.threads.length);
          })
          .catch(() => {});
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load course"));
  }, [courseId]);

  React.useEffect(() => {
    if (!identity) return;
    load();
  }, [identity, load]);

  const loading = course === null && modules === null && !error;
  const role = identity?.role ?? "student";

  const progressPercent =
    lectureStats && lectureStats.total > 0
      ? Math.round((lectureStats.completed / lectureStats.total) * 100)
      : 0;

  const filteredModules = React.useMemo(() => {
    if (!modules || !searchQuery) return modules;
    const q = searchQuery.toLowerCase();
    return modules.filter((m) => m.name.toLowerCase().includes(q));
  }, [modules, searchQuery]);

  if (error) {
    return (
      <div className="min-h-screen bg-canvas">
        <AppNav courseId={courseId} activeHref={`/course/${courseId}`} />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <h2 className="text-[24px]">Couldn&rsquo;t load this course</h2>
            <p className="text-[15px] text-muted font-body">{error}</p>
            <Button variant="secondary" onClick={load}>
              Try again
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav
        courseId={courseId}
        course={course ? { code: course.code, title: course.name } : null}
        activeHref={`/course/${courseId}`}
      />

      <main className="w-full bg-canvas min-h-screen">
        <div className="flex flex-col w-full px-6 lg:px-8 py-10 max-w-[1400px] mx-auto">
          {loading ? (
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="h-10 w-2/3 animate-pulse rounded-[var(--radius-control)] bg-hairline/70" />
                <div className="h-4 w-1/3 animate-pulse rounded-[var(--radius-control)] bg-hairline/70" />
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} className="h-64" />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Course Hero */}
              <header className="w-full mb-10">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6">
                  <div className="flex flex-col gap-1 max-w-3xl">
                    {/* Term badge */}
                    <div className="flex items-center gap-3 mb-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-surface-variant text-[11px] font-semibold font-body uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-button-primary animate-pulse" />
                        {course?.term ?? "Current Term"}
                      </span>
                    </div>

                    {/* EB Garamond headline */}
                    <h1 className="font-headline text-[48px] tracking-tight leading-tight text-ink">
                      {course?.name ?? "Course"}
                    </h1>

                    <p className="text-[15px] text-muted font-body mt-1">
                      {[course?.instructorName, course?.code].filter(Boolean).join(" · ")}
                    </p>
                    {course?.description && (
                      <p className="text-[14px] text-body font-body mt-2 max-w-2xl leading-relaxed">
                        {course.description}
                      </p>
                    )}
                    {course?.prerequisites && (
                      <p className="text-[12px] text-muted font-body mt-1">
                        <span className="font-semibold text-ink">Prerequisites:</span> {course.prerequisites}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {course?.textbookTitle && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-card border border-hairline text-[12px] text-body font-body">
                          <BookOpen className="size-3.5 text-button-primary shrink-0" />
                          {course.textbookUrl
                            ? <a href={course.textbookUrl} target="_blank" rel="noreferrer" className="hover:text-button-primary transition-colors">{course.textbookTitle}</a>
                            : course.textbookTitle}
                        </span>
                      )}
                      {course?.syllabusUrl && (
                        <a href={course.syllabusUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-card border border-hairline text-[12px] text-body font-body hover:text-button-primary transition-colors">
                          📄 Syllabus
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Stat pills */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/course/${courseId}/forum`}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-surface-card hover:bg-surface-cream-strong transition-all shadow-sm"
                    >
                      <ChatCircle weight="fill" className="size-[18px] text-button-primary" />
                      <span className="text-[13px] font-medium font-body text-ink">
                        {openQuestionCount > 0 ? `${openQuestionCount} Inquiries on Slides` : "Open Questions"}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-button-primary" />
                    </Link>
                    {role === "teacher" && reviewPendingCount ? (
                      <Link
                        href={`/course/${courseId}/review`}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-primary-fixed hover:bg-primary-fixed-dim/20 transition-all shadow-sm"
                      >
                        <Code weight="fill" className="size-[18px] text-accent-text" />
                        <span className="text-[13px] font-medium font-body text-accent-text">
                          {reviewPendingCount} Peer Widgets Pending Review
                        </span>
                      </Link>
                    ) : null}
                    {role === "teacher" && (
                      <Link
                        href={`/course/${courseId}/settings`}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-surface-card hover:bg-surface-cream-strong transition-all shadow-sm border border-hairline"
                      >
                        <GearSix weight="duotone" className="size-[16px] text-muted" />
                        <span className="text-[13px] font-medium font-body text-body">Course Details</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Progress card */}
                {lectureStats && lectureStats.total > 0 ? (
                  <div className="w-full bg-surface-card rounded-xl p-5 lg:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                    <div className="flex flex-col gap-1 w-full md:max-w-xl">
                      <div className="flex items-center justify-between text-[13px] font-medium mb-1">
                        <span className="text-ink flex items-center gap-2">
                          <BookOpen weight="fill" className="size-5 text-button-primary" />
                          {lectureStats.completed} of {lectureStats.total} Lectures Completed
                        </span>
                        <span className="text-button-primary font-mono font-semibold">{progressPercent}% Mastered</span>
                      </div>
                      <div className="w-full h-2.5 bg-secondary-container rounded-full overflow-hidden p-0.5">
                        <div
                          className="h-full bg-button-primary rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      {inProgressLecture?.name ? (
                        <span className="text-[13px] text-muted font-body mt-1">
                          Currently working on:{" "}
                          <strong className="text-ink font-medium">{inProgressLecture.name}</strong>
                        </span>
                      ) : null}
                    </div>

                    {inProgressLecture ? (
                      <div className="flex items-center gap-3 shrink-0">
                        <Link
                          href={`/course/${courseId}/module/${inProgressLecture.moduleId}/lecture/${inProgressLecture.id}`}
                          className="inline-flex items-center justify-center gap-1.5 bg-button-primary hover:bg-button-primary-hover text-on-primary px-4 py-2.5 rounded-lg text-[13px] font-medium font-body shadow transition-colors"
                          id="active-lecture"
                        >
                          <span>Jump to Active Slide</span>
                          <ArrowRight className="size-4" />
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </header>

              {/* 12-col main grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* Left 8 cols — Curriculum */}
                <section className="lg:col-span-8 flex flex-col gap-6">
                  {/* Section header + search + view toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <h2 className="text-[26px] font-headline text-ink">Curriculum &amp; Slide Decks</h2>
                      <p className="text-[13px] text-muted font-body">
                        Interactive annotations, lecture captures, and algorithmic testbenches.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <MagnifyingGlass className="absolute left-3 top-2.5 size-[16px] text-muted" />
                        <input
                          className="pl-8 pr-3 py-1.5 bg-surface-lowest text-ink rounded-lg text-[13px] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-button-primary shadow-sm font-body w-[200px]"
                          placeholder="Search modules..."
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <SegmentedControl
                        label="View"
                        value={view}
                        onChange={setView}
                        options={[
                          { value: "grid", label: "Grid" },
                          { value: "flow", label: "Flow" },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Module grid or flow */}
                  {filteredModules && filteredModules.length > 0 ? (
                    <div>
                      {view === "grid" ? (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                          {filteredModules.map((m) => (
                            <ModuleCard
                              key={m.id}
                              module={m}
                              courseId={courseId}
                              role={role}
                              lectureCount={lectureCounts[m.id]}
                            />
                          ))}
                          {role === "teacher" ? (
                            <Link href={`/course/${courseId}/module/new`}>
                              <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-card)] border border-dashed border-hairline p-6 text-center transition-colors hover:border-body">
                                <span className="text-[22px] leading-none text-muted">+</span>
                                <span className="text-[14px] font-medium font-body text-muted">Add Module</span>
                              </div>
                            </Link>
                          ) : null}
                        </div>
                      ) : (
                        <FlowView modules={filteredModules} courseId={courseId} />
                      )}
                    </div>
                  ) : modules && modules.length === 0 ? (
                    <div className="mt-16 flex flex-col items-center gap-4 text-center">
                      <h2 className="text-[24px]">No modules yet</h2>
                      {role === "teacher" ? (
                        <Button asChild>
                          <Link href={`/course/${courseId}/module/new`}>+ Add Module</Link>
                        </Button>
                      ) : (
                        <p className="max-w-sm text-[15px] text-muted font-body">
                          Your instructor hasn&rsquo;t published modules yet. Check back soon.
                        </p>
                      )}
                    </div>
                  ) : searchQuery ? (
                    <p className="text-[14px] text-muted font-body">No modules match &ldquo;{searchQuery}&rdquo;</p>
                  ) : null}
                </section>

                {/* Right 4 cols — Community Rail */}
                <aside className="lg:col-span-4 flex flex-col gap-6" id="activity-feed">
                  {/* Recent activity */}
                  <div className="bg-surface-lowest rounded-xl p-6 shadow-sm flex flex-col gap-5">
                    <div className="flex items-center justify-between pb-4 border-b border-hairline">
                      <div>
                        <h3 className="text-[20px] font-headline text-ink">Recent Slide Activity</h3>
                        <p className="text-[13px] text-muted font-body">Live community contributions</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {threads.slice(0, 4).map((thread, i) => (
                        <div
                          key={thread.id ?? i}
                          className="p-3 rounded-lg bg-surface-soft hover:bg-surface-card transition-colors group flex flex-col gap-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <span className="w-7 h-7 rounded-full bg-surface-card flex items-center justify-center text-muted shrink-0 mt-0.5">
                                <ChatCircle className="size-4" />
                              </span>
                              <h4 className="text-[13px] font-medium font-body text-ink group-hover:text-button-primary transition-colors line-clamp-2">
                                {thread.question}
                              </h4>
                            </div>
                          </div>
                          {thread.answerCount !== undefined && (
                            <div className="flex items-center justify-end">
                              <span className="text-[11px] text-muted font-body">{thread.answerCount} replies</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {threads.length === 0 && (
                        <p className="text-[13px] text-muted font-body text-center py-4">No recent activity</p>
                      )}
                    </div>

                    <div className="pt-2 text-center border-t border-hairline">
                      <Link
                        href={`/course/${courseId}/forum`}
                        className="text-[13px] font-medium font-body text-button-primary hover:text-accent-text transition-colors inline-flex items-center gap-1"
                      >
                        <span>View all community contributions</span>
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Office hours */}
                  <div className="bg-surface-lowest rounded-xl p-6 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-ink">
                      <Lightning weight="fill" className="size-5 text-button-primary" />
                      <h4 className="text-[20px] font-headline">Section &amp; Office Hours</h4>
                    </div>
                    {course?.officeHours ? (
                      <p className="text-[14px] text-body font-body whitespace-pre-line">
                        {course.officeHours}
                      </p>
                    ) : (
                      <p className="text-[13px] text-muted font-body">
                        TAs are available for questions on current lecture topics.
                      </p>
                    )}
                    <div className="bg-surface-soft rounded-lg p-3 flex items-center justify-between mt-1">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium font-body text-ink">
                          {course?.officeHours ? "See schedule above" : "Check schedule for availability"}
                        </span>
                        <span className="text-[11px] text-muted font-body">Ask questions on the forum</span>
                      </div>
                      <Link
                        href={`/course/${courseId}/forum`}
                        className="px-3 py-1.5 rounded-lg bg-secondary-container hover:bg-surface-cream-strong text-ink text-[11px] font-semibold font-body transition-colors"
                      >
                        View Forum
                      </Link>
                    </div>
                  </div>

                  {/* Honor code */}
                  <div className="p-4 rounded-xl bg-surface-card text-muted text-[13px] font-body flex items-start gap-3">
                    <BookOpen weight="fill" className="size-5 text-button-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="text-ink font-semibold block mb-0.5">Academic Integrity</span>
                      Peer widgets and slide clarifications must cite external references. All uploaded visualizers undergo automated screening.
                    </div>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
