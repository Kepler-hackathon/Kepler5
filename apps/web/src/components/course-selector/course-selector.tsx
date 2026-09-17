"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeplerMark } from "@/components/nav/kepler-mark";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIdentity, setStoredRole, type Role } from "@/lib/identity";
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
  const [role, setRole] = React.useState<Role>("student");

  React.useEffect(() => {
    const stored = window.localStorage.getItem("keplerlearn:last-role");
    if (stored === "teacher" || stored === "student") setRole(stored);
  }, []);

  function switchRole(next: Role) {
    setRole(next);
    setStoredRole(next);
    window.dispatchEvent(new CustomEvent("keplerlearn:role-change", { detail: next }));
  }

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
      <nav className="sticky top-0 z-20 flex h-16 items-center justify-between gap-6 border-b border-hairline bg-canvas px-6">
        <div className="flex items-center gap-3">
          <Link href="/courses" className="flex shrink-0 items-center gap-2">
            <KeplerMark className="size-6" />
            <span className="font-display text-[20px] text-ink">KeplerLearn</span>
          </Link>
        </div>
        <div className="hidden items-center gap-1 md:flex">
          {role === "student" ? (
            <>
              <span className="rounded-full bg-surface-card px-3.5 py-1.5 text-[13px] font-medium font-body text-ink">Courses</span>
              <Link href="/quizzes" className="rounded-full px-3.5 py-1.5 text-[13px] font-medium font-body text-muted hover:text-ink transition-colors">Practice Quizzes</Link>
              <Link href="/progress" className="rounded-full px-3.5 py-1.5 text-[13px] font-medium font-body text-muted hover:text-ink transition-colors">My Progress</Link>
            </>
          ) : (
            <>
              <span className="rounded-full bg-surface-card px-3.5 py-1.5 text-[13px] font-medium font-body text-ink">Courses</span>
            </>
          )}
        </div>
        <div className="shrink-0">
          <SegmentedControl
            label="Role"
            value={role}
            onChange={switchRole}
            options={[
              { value: "student", label: "Student" },
              { value: "teacher", label: "Teacher" },
            ]}
          />
        </div>
      </nav>

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
