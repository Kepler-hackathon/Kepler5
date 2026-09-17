"use client";

import * as React from "react";
import Link from "next/link";
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
}

export function CourseLanding({ courseId }: { courseId: string }) {
  const identity = useIdentity();
  const [course, setCourse] = React.useState<ApiCourse | null>(null);
  const [modules, setModules] = React.useState<ApiModule[] | null>(null);
  const [reviewPendingCount, setReviewPendingCount] = React.useState<number | undefined>(undefined);
  const [error, setError] = React.useState<string | null>(null);
  const [view, setView] = React.useState<"grid" | "flow">("grid");

  const load = React.useCallback(() => {
    setError(null);
    Promise.all([
      apiJson<{ courses: ApiCourse[] }>("/api/courses").then((d) => d.courses.find((c) => c.id === courseId) ?? null),
      apiJson<{ modules: ApiModule[]; reviewPendingCount?: number }>(`/api/course?courseId=${courseId}`),
    ])
      .then(([foundCourse, moduleData]) => {
        setCourse(foundCourse);
        setModules(moduleData.modules);
        setReviewPendingCount(moduleData.reviewPendingCount);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load course"));
  }, [courseId]);

  React.useEffect(() => {
    if (!identity) return;
    load();
  }, [identity, load]);

  const loading = course === null && modules === null && !error;
  const role = identity?.role ?? "student";

  if (error) {
    return (
      <div className="min-h-screen bg-canvas">
        <AppNav courseId={courseId} activeHref={`/course/${courseId}`} />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <h2 className="text-[24px]">Couldn&rsquo;t load this course</h2>
            <p className="text-[15px] text-muted font-body">{error}</p>
            <Button variant="secondary" onClick={load}>Try again</Button>
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
              <h1>{course?.name ?? "Course"}</h1>
              <p className="mt-1 text-[15px] text-muted font-body">
                {[course?.instructorName, course?.term].filter(Boolean).join(" · ")}
              </p>
              {role === "teacher" && reviewPendingCount ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#bb5a3a]/30 bg-[#bb5a3a]/10 px-3 py-1 text-[13px] text-[#bb5a3a] font-body">
                    {reviewPendingCount} widgets ready to review
                  </span>
                </div>
              ) : null}
            </header>

            {modules && modules.length > 0 ? (
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
                        <ModuleCard key={m.id} module={m} courseId={courseId} role={role} />
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
                    <FlowView modules={modules} courseId={courseId} />
                  )}
                </div>
              </>
            ) : (
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
            )}
          </>
        )}
      </main>
    </div>
  );
}
