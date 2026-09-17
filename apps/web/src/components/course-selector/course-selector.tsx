"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeplerMark } from "@/components/nav/kepler-mark";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIdentity } from "@/lib/identity";
import { apiJson, ApiError } from "@/lib/api-client";
import { CreateCourseDialog } from "./create-course-dialog";

interface ApiCourse {
  id: string;
  code: string | null;
  name: string;
  term: string | null;
  instructorName: string | null;
}

export function CourseSelector() {
  const identity = useIdentity();
  const router = useRouter();
  const [courses, setCourses] = React.useState<ApiCourse[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    apiJson<{ courses: ApiCourse[] }>("/api/courses")
      .then((data) => setCourses(data.courses))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load courses"));
  }, []);

  React.useEffect(() => {
    if (!identity) return;
    load();
  }, [identity, load]);

  function onCreated(course: ApiCourse) {
    router.push(`/course/${course.id}`);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="border-b border-hairline">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-5">
          <KeplerMark className="size-7" />
          <span className="font-display text-[22px] text-ink">KeplerLearn</span>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1>Your courses</h1>
        <p className="mt-1 text-[15px] text-muted font-body">Pick a course to continue.</p>

        {error ? <p className="mt-4 text-[14px] text-[#bb5a3a] font-body">{error}</p> : null}

        {courses === null ? (
          <p className="mt-8 text-[14px] text-muted font-body">Loading…</p>
        ) : courses.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <h2 className="text-[20px]">No courses yet</h2>
            {identity?.role === "teacher" ? (
              <CreateCourseDialog
                trigger={<Button variant="primary">Create your first course</Button>}
                onCreated={onCreated}
              />
            ) : (
              <p className="text-[14px] text-muted font-body">Check back once your instructor creates one.</p>
            )}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {courses.map((c) => (
              <Link key={c.id} href={`/course/${c.id}`}>
                <Card className="flex h-full flex-col p-6 transition-colors hover:border-body">
                  {c.code ? (
                    <p className="text-[13px] font-medium font-body uppercase tracking-[1px] text-accent-text">{c.code}</p>
                  ) : null}
                  <h3 className="mt-1.5 line-clamp-2 text-[22px] leading-snug">{c.name}</h3>
                  <p className="mt-1 text-[13px] text-muted font-body">
                    {[c.instructorName, c.term].filter(Boolean).join(" · ")}
                  </p>
                </Card>
              </Link>
            ))}
            {identity?.role === "teacher" ? (
              <CreateCourseDialog
                trigger={
                  <button
                    type="button"
                    className="flex h-full min-h-[140px] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-card)] border border-dashed border-hairline p-6 text-center transition-colors hover:border-body"
                  >
                    <span className="text-[22px] leading-none text-muted">+</span>
                    <span className="text-[14px] font-medium font-body text-muted">New Course</span>
                  </button>
                }
                onCreated={onCreated}
              />
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
