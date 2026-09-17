"use client";

import * as React from "react";
import { AppNav } from "@/components/nav/app-nav";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ProgressBar } from "@/components/ui/progress";
import { SkeletonCard } from "@/components/ui/skeleton";
import { ModuleCard } from "./module-card";
import { FlowView } from "./flow-view";
import type { Course } from "@/lib/data/types";
import { modules, courseProgress, totalOpenQuestions } from "@/lib/data/course-landing";

export function CourseLanding({ course }: { course: Course }) {
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState<"grid" | "flow">("grid");

  React.useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 400);
    return () => window.clearTimeout(t);
  }, []);

  const progress = courseProgress();
  const openQuestions = totalOpenQuestions();
  const widgetsCollectingUpvotes = 5; // student-facing chip (frontend plan S1 edges)

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav courseId={course.id} activeHref={`/course/${course.id}`} />

      <main className="mx-auto max-w-5xl px-6 py-10">
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
            <header>
              <h1>{course.title}</h1>
              <p className="mt-1 text-[15px] text-muted font-body">
                {course.instructor} · {course.term}
              </p>

              {course.hasModules ? (
                <>
                  <div className="mt-5 max-w-md">
                    <div className="mb-1.5 flex items-center justify-between text-[13px] font-body">
                      <span className="text-muted">Course progress</span>
                      <span className="font-medium text-ink">{progress}%</span>
                    </div>
                    <ProgressBar value={progress} label="Course completion" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {openQuestions > 0 ? (
                      <span className="rounded-full border border-hairline bg-surface-card px-3 py-1 text-[13px] text-ink font-body">
                        {openQuestions} open {openQuestions === 1 ? "question" : "questions"} on recent slides
                      </span>
                    ) : null}
                    {widgetsCollectingUpvotes > 0 ? (
                      <span className="rounded-full border border-hairline bg-surface-card px-3 py-1 text-[13px] text-ink font-body">
                        {widgetsCollectingUpvotes} widgets collecting upvotes
                      </span>
                    ) : null}
                  </div>
                </>
              ) : null}
            </header>

            {course.hasModules ? (
              <>
                <div className="mt-8 flex items-center justify-between">
                  <h2 className="text-[24px]">Modules</h2>
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

                <div className="mt-5">
                  {view === "grid" ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {modules.map((m) => (
                        <ModuleCard key={m.id} module={m} courseId={course.id} />
                      ))}
                    </div>
                  ) : (
                    <FlowView modules={modules} courseId={course.id} />
                  )}
                </div>
              </>
            ) : (
              // Frontend plan S1 "no modules" state: "Your instructor hasn't published modules yet."
              <div className="mt-16 flex flex-col items-center gap-2 text-center">
                <h2 className="text-[24px]">No modules yet</h2>
                <p className="max-w-sm text-[15px] text-muted font-body">
                  Your instructor hasn&rsquo;t published modules yet. Check back soon.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
