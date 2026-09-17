import Link from "next/link";
import { KeplerMark } from "@/components/nav/kepler-mark";
import { Card } from "@/components/ui/card";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { courses } from "@/lib/data/courses";
import { modules } from "@/lib/data/course-landing";

export function CourseSelector() {
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
        <p className="mt-1 text-[15px] text-muted font-body">Fall 2026 · pick a course to continue.</p>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {courses.map((c) => (
            <Link key={c.id} href={`/course/${c.id}`}>
              <Card className="flex h-full flex-col p-6 transition-colors hover:border-body">
                <p className="text-[13px] font-medium font-body uppercase tracking-[1px] text-accent-text">{c.code}</p>
                <h3 className="mt-1.5 line-clamp-2 text-[22px] leading-snug">{c.title}</h3>
                <p className="mt-1 text-[13px] text-muted font-body">
                  {c.instructor} · {c.term}
                </p>
                <div className="mt-4">
                  {c.hasModules ? (
                    <StatusIndicator kind="in-progress" label={`${modules.length} modules published`} />
                  ) : (
                    <StatusIndicator kind="not-started" label="Not yet published" />
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
