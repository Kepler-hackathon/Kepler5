"use client";

import * as React from "react";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import { AppNav } from "@/components/nav/app-nav";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { StatusGlyph } from "@/components/ui/status-indicator";
import { cn } from "@/lib/cn";
import { LectureRow } from "./lecture-row";
import type { Course } from "@/lib/data/types";
import type { ModuleDetail as ModuleDetailData } from "@/lib/data/curriculum";
import { moduleStats } from "@/lib/data/analytics";

export function ModuleDetail({ course, module }: { course: Course; module: ModuleDetailData }) {
  const [view, setView] = React.useState<"list" | "flow">("list");
  const [overviewExpanded, setOverviewExpanded] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(() => Math.random() < 0.02);
  const [role, setRole] = React.useState<"student" | "teacher">("student");
  const completedLectures = module.lectures.filter((l) => l.status === "done").length;
  const [modulePublished, setModulePublished] = React.useState(() => completedLectures === module.lectures.length);
  const analyticsRow = moduleStats.find((s) => s.moduleNumber === module.number);
  const toast = useToast();

  React.useEffect(() => {
    const stored = window.localStorage.getItem("keplerlearn:last-role");
    if (stored === "teacher") setRole("teacher");
    const handler = (e: Event) => setRole((e as CustomEvent<"student" | "teacher">).detail);
    window.addEventListener("keplerlearn:role-change", handler);
    return () => window.removeEventListener("keplerlearn:role-change", handler);
  }, []);

  React.useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas">
        <AppNav courseId={course.id} activeHref={`/course/${course.id}`} />
        <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-hairline/70" />
            <div className="h-10 w-2/3 animate-pulse rounded bg-hairline/70" />
            <div className="h-4 w-full animate-pulse rounded bg-hairline/70" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-hairline/70" />
          </div>
          <div className="space-y-2 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-[var(--radius-control)] bg-hairline/70" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-canvas">
        <AppNav courseId={course.id} activeHref={`/course/${course.id}`} />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <h2 className="text-[24px]">Couldn&rsquo;t load this module</h2>
            <p className="text-[15px] text-muted font-body">Something went wrong. Try refreshing.</p>
            <Button variant="secondary" onClick={() => setHasError(false)}>Try again</Button>
          </div>
        </main>
      </div>
    );
  }

  const isUnavailable = module.lectures.length === 0;

  if (isUnavailable) {
    return (
      <div className="min-h-screen bg-canvas">
        <AppNav courseId={course.id} activeHref={`/course/${course.id}`} />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <h2 className="text-[24px]">This module isn&rsquo;t available yet</h2>
            <p className="text-[15px] text-muted font-body">
              Your instructor hasn&rsquo;t published this module. Check back later.
            </p>
            <Button asChild variant="secondary">
              <Link href={`/course/${course.id}`}>Back to course</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav courseId={course.id} activeHref={`/course/${course.id}`} />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[13px] font-medium font-body uppercase tracking-[1px] text-accent-text">
          Module {module.number}
        </p>
        <h1 className="mt-1">{module.title}</h1>

        {role === "teacher" ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={cn(
              "rounded-full border px-3 py-1 text-[13px] font-medium font-body",
              modulePublished
                ? "border-success/30 bg-success/10 text-success"
                : "border-[#bb5a3a]/30 bg-[#bb5a3a]/10 text-[#bb5a3a]"
            )}>
              {modulePublished ? "Published" : "Ready to review"}
            </span>
            <Button
              variant={modulePublished ? "ghost" : "primary"}
              size="sm"
              onClick={() => {
                setModulePublished((v) => !v);
                toast.push({ message: modulePublished ? "Module unpublished · students can no longer see it" : "Module published · students can now access it" });
              }}
            >
              {modulePublished ? "Unpublish" : "Publish module"}
            </Button>
          </div>
        ) : null}

        {role === "teacher" ? (
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-[var(--radius-control)] border border-hairline bg-surface-card px-4 py-3">
              <p className="text-[12px] text-muted font-body">Students started</p>
              <p className="mt-0.5 text-[22px] font-display text-ink">
                {analyticsRow?.studentsStarted ?? 0}
              </p>
            </div>
            <div className="rounded-[var(--radius-control)] border border-hairline bg-surface-card px-4 py-3">
              <p className="text-[12px] text-muted font-body">Completed module</p>
              <p className="mt-0.5 text-[22px] font-display text-ink">
                {analyticsRow?.studentsCompleted ?? 0}
              </p>
            </div>
            <div className="rounded-[var(--radius-control)] border border-hairline bg-surface-card px-4 py-3">
              <p className="text-[12px] text-muted font-body">Avg quiz score</p>
              <p className="mt-0.5 text-[22px] font-display text-ink">
                {analyticsRow?.avgQuizScore != null ? `${analyticsRow.avgQuizScore}%` : "—"}
              </p>
            </div>
          </div>
        ) : null}

        <p className={cn("mt-3 max-w-2xl text-[15px] leading-relaxed text-body font-body", !overviewExpanded && "line-clamp-4")}>
          {module.overview}
        </p>
        {!overviewExpanded ? (
          <button
            onClick={() => setOverviewExpanded(true)}
            className="mt-1 text-[13px] font-medium font-body text-accent-text hover:underline underline-offset-2"
          >
            Read more
          </button>
        ) : null}

        {module.objectives.length > 0 ? (
          <div className="mt-5">
            <p className="text-[13px] font-medium font-body uppercase tracking-[0.5px] text-muted">You&rsquo;ll be able to</p>
            <ul className="mt-2 space-y-1.5">
              {module.objectives.map((o) => (
                <li key={o} className="text-[14px] leading-relaxed text-body font-body">
                  {o}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-[24px]">Lectures</h2>
          <SegmentedControl
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: "list", label: "List" },
              { value: "flow", label: "Flow" },
            ]}
          />
        </div>

        <div className="mt-5">
          {view === "list" ? (
            <div className="space-y-2">
              {module.lectures.map((l) => (
                <LectureRow key={l.number} lecture={l} />
              ))}
              {role === "teacher" ? (
                <p className="mt-3 text-[13px] text-muted font-body">
                  Quiz performance per lecture is available in{" "}
                  <Link href={`/course/${course.id}/analytics`} className="font-medium text-accent-text hover:underline underline-offset-2">
                    Analytics &rarr;
                  </Link>
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
              {module.lectures.map((l, i) => {
                const inner = (
                  <div className="flex w-full items-center gap-3 rounded-[var(--radius-control)] border border-hairline bg-surface-card px-4 py-3 lg:w-56 transition-colors hover:border-body">
                    <StatusGlyph
                      kind={l.status === "done" ? "done" : l.status === "in-progress" ? "in-progress" : "not-started"}
                      label={l.status}
                    />
                    <span className="line-clamp-2 text-[14px] font-medium font-body text-ink">
                      {l.number}. {l.title}
                    </span>
                  </div>
                );
                return (
                  <div key={l.number} className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center lg:gap-3">
                    {l.hasContent ? (
                      <Link href={`/lecture/${l.number}${l.resumeSlide ? `?slide=${l.resumeSlide}` : ""}`} className="w-full lg:w-auto">
                        {inner}
                      </Link>
                    ) : (
                      <button
                        onClick={() => toast.push({ message: "This lecture doesn't have authored content in this preview." })}
                        className="w-full text-left lg:w-auto"
                      >
                        {inner}
                      </button>
                    )}
                    {i < module.lectures.length - 1 ? (
                      <CaretRight className="mx-auto size-4 rotate-90 text-hairline lg:mx-0 lg:rotate-0" aria-hidden />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
