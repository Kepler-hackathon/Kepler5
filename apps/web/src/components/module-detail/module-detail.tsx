"use client";

import * as React from "react";
import Link from "next/link";
import { AppNav } from "@/components/nav/app-nav";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { LectureRow } from "./lecture-row";
import { UploadPanel } from "./upload-panel";
import { useIdentity } from "@/lib/identity";
import { apiJson, ApiError } from "@/lib/api-client";
import type { ApiLecture, ApiModuleDetail } from "./types";

interface ApiCourse {
  id: string;
  code: string | null;
  name: string;
}

export function ModuleDetail({ courseId, moduleId }: { courseId: string; moduleId: string }) {
  const identity = useIdentity();
  const toast = useToast();
  const [course, setCourse] = React.useState<ApiCourse | null>(null);
  const [module, setModule] = React.useState<ApiModuleDetail | null>(null);
  const [lectures, setLectures] = React.useState<ApiLecture[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [overviewExpanded, setOverviewExpanded] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const role = identity?.role ?? "student";

  const load = React.useCallback(() => {
    setError(null);
    Promise.all([
      apiJson<{ courses: ApiCourse[] }>("/api/courses").then((d) => d.courses.find((c) => c.id === courseId) ?? null),
      apiJson<ApiModuleDetail>(`/api/modules/${moduleId}`),
      apiJson<ApiLecture[]>(`/api/modules/${moduleId}/lectures`),
    ])
      .then(([c, mod, lects]) => {
        setCourse(c);
        setModule(mod);
        setLectures(lects);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load module"));
  }, [courseId, moduleId]);

  React.useEffect(() => {
    if (!identity) return;
    load();
  }, [identity, load]);

  async function publish() {
    setPublishing(true);
    try {
      await apiJson(`/api/modules/${moduleId}/publish`, { method: "POST" });
      toast.push({ message: "Module published · students can now access it" });
      load();
    } catch (err) {
      toast.push({ message: err instanceof ApiError ? err.message : "Failed to publish module" });
    } finally {
      setPublishing(false);
    }
  }

  const loading = module === null && lectures === null && !error;

  if (error) {
    return (
      <div className="min-h-screen bg-canvas">
        <AppNav courseId={courseId} course={course ? { code: course.code, title: course.name } : null} activeHref={`/course/${courseId}`} />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <h2 className="text-[24px]">Couldn&rsquo;t load this module</h2>
            <p className="text-[15px] text-muted font-body">{error}</p>
            <Button variant="secondary" onClick={load}>Try again</Button>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas">
        <AppNav courseId={courseId} course={course ? { code: course.code, title: course.name } : null} activeHref={`/course/${courseId}`} />
        <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-hairline/70" />
            <div className="h-10 w-2/3 animate-pulse rounded bg-hairline/70" />
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

  const isUnavailable = role === "student" && (lectures?.length ?? 0) === 0;
  if (isUnavailable) {
    return (
      <div className="min-h-screen bg-canvas">
        <AppNav courseId={courseId} course={course ? { code: course.code, title: course.name } : null} activeHref={`/course/${courseId}`} />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <h2 className="text-[24px]">This module isn&rsquo;t available yet</h2>
            <p className="text-[15px] text-muted font-body">Your instructor hasn&rsquo;t published this module. Check back later.</p>
            <Button asChild variant="secondary">
              <Link href={`/course/${courseId}`}>Back to course</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const modulePublished = module!.status === "published";

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav courseId={courseId} course={course ? { code: course.code, title: course.name } : null} activeHref={`/course/${courseId}`} />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[13px] font-medium font-body uppercase tracking-[1px] text-accent-text">
          Module {module!.orderIndex ?? ""}
        </p>
        <h1 className="mt-1">{module!.name}</h1>

        {role === "teacher" ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-[13px] font-medium font-body",
                modulePublished
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-[#bb5a3a]/30 bg-[#bb5a3a]/10 text-[#bb5a3a]"
              )}
            >
              {modulePublished ? "Published" : module!.status.replace("_", " ")}
            </span>
            {!modulePublished ? (
              <Button variant="primary" size="sm" onClick={publish} disabled={publishing}>
                {publishing ? "Publishing…" : "Publish module"}
              </Button>
            ) : null}
          </div>
        ) : null}

        {module!.overviewMd ? (
          <>
            <p className={cn("mt-3 max-w-2xl text-[15px] leading-relaxed text-body font-body", !overviewExpanded && "line-clamp-4")}>
              {module!.overviewMd}
            </p>
            {!overviewExpanded ? (
              <button
                onClick={() => setOverviewExpanded(true)}
                className="mt-1 text-[13px] font-medium font-body text-accent-text hover:underline underline-offset-2"
              >
                Read more
              </button>
            ) : null}
          </>
        ) : null}

        {module!.objectives.length > 0 ? (
          <div className="mt-5">
            <p className="text-[13px] font-medium font-body uppercase tracking-[0.5px] text-muted">You&rsquo;ll be able to</p>
            <ul className="mt-2 space-y-1.5">
              {module!.objectives.map((o) => (
                <li key={o} className="text-[14px] leading-relaxed text-body font-body">{o}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-[24px]">Lectures</h2>
        </div>

        <div className="mt-5 space-y-2">
          {(lectures ?? []).map((l) => (
            <LectureRow key={l.id} lecture={l} />
          ))}
          {(lectures ?? []).length === 0 ? (
            <p className="text-[14px] text-muted font-body">No lectures yet.</p>
          ) : null}
        </div>

        {role === "teacher" ? (
          <UploadPanel moduleId={moduleId} existingLectures={lectures ?? []} onDone={load} />
        ) : null}
      </main>
    </div>
  );
}
