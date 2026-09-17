"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeplerMark } from "@/components/nav/kepler-mark";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIdentity } from "@/lib/identity";
import { apiJson, ApiError } from "@/lib/api-client";

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
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");

  const load = React.useCallback(() => {
    apiJson<{ courses: ApiCourse[] }>("/api/courses")
      .then((data) => setCourses(data.courses))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load courses"));
  }, []);

  React.useEffect(() => {
    if (!identity) return;
    load();
  }, [identity, load]);

  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const course = await apiJson<ApiCourse>("/api/courses", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      router.push(`/course/${course.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create course");
    } finally {
      setCreating(false);
    }
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
              <form onSubmit={createCourse} className="mt-2 flex w-full max-w-sm gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Course name"
                  className="flex-1 rounded-[var(--radius-control)] border border-hairline bg-surface-card px-3 py-2 text-[14px] font-body"
                />
                <Button type="submit" disabled={creating || !name.trim()}>
                  {creating ? "Creating…" : "Create course"}
                </Button>
              </form>
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
          </div>
        )}
      </main>
    </div>
  );
}
