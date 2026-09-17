"use client";

import * as React from "react";
import Link from "next/link";
import { ChatCircleDots } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { KeplerMark } from "./kepler-mark";
import { SegmentedControl } from "@/components/ui/segmented-control";

interface CourseLabel {
  code: string | null;
  title: string;
}

/** Global nav shell (frontend plan Part I §5.1). */
export function AppNav({
  courseId,
  course,
  activeHref = "/courses",
}: {
  courseId: string;
  course?: CourseLabel | null;
  activeHref?: string;
}) {
  const [role, setRole] = React.useState<"student" | "teacher">("student");
  const courseHref = `/course/${courseId}`;

  React.useEffect(() => {
    const stored = window.localStorage.getItem("keplerlearn:last-role");
    if (stored === "teacher") setRole("teacher");
  }, []);

  const studentTabs = [
    { label: "Lectures", href: courseHref },
    { label: "FAQ Forum", href: `${courseHref}/forum` },
    { label: "Practice Quizzes", href: "/quizzes" },
    { label: "My Progress", href: "/progress" },
  ];

  const teacherTabs = [
    { label: "Modules", href: courseHref },
    { label: "Review Queue", href: `/course/${courseId}/review` },
    { label: "Analytics", href: `/course/${courseId}/analytics` },
    { label: "Forum", href: `${courseHref}/forum` },
    { label: "Course Details", href: `/course/${courseId}/settings` },
  ];

  const tabs = role === "teacher" ? teacherTabs : studentTabs;

  return (
    <nav className="sticky top-0 z-20 flex h-16 items-center justify-between gap-6 border-b border-hairline bg-canvas px-6">
      <div className="flex min-w-0 items-center gap-6">
        <Link href="/courses" className="flex shrink-0 items-center gap-2">
          <KeplerMark className="size-6" />
          <span className="font-display text-[20px] text-ink">KeplerLearn</span>
        </Link>
        {course ? (
          <Link
            href="/courses"
            title="Switch course"
            className="hidden truncate text-[14px] text-muted font-body transition-colors hover:text-ink sm:inline"
          >
            {course.code}: {course.title}
          </Link>
        ) : null}
      </div>

      <div className="hidden items-center gap-1 md:flex">
        {tabs.map((tab) => {
          const active = tab.href === activeHref;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] font-medium font-body transition-colors",
                active ? "bg-surface-card text-ink" : "text-muted hover:text-ink"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
        {role === "student" ? (
          <Link
            href="/assistant"
            aria-label="AI Course Assistant"
            className={cn(
              "ml-1 rounded-full p-2 transition-colors hover:bg-surface-soft hover:text-ink",
              activeHref === "/assistant" ? "bg-surface-card text-ink" : "text-muted"
            )}
          >
            <ChatCircleDots className="size-5" />
          </Link>
        ) : null}
      </div>

      {/* Contextual live indicator */}
      {activeHref.includes("/review") ? (
        <span className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full border border-error/30 bg-error/10 px-2.5 py-1 text-[11px] font-semibold font-body text-error">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-error opacity-60" style={{ animationDuration: "1.6s" }} />
            <span className="relative size-1.5 rounded-full bg-error" />
          </span>
          Reviewing
        </span>
      ) : activeHref.includes("/analytics") ? (
        <span className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full border border-warning/30 bg-amber-fill/10 px-2.5 py-1 text-[11px] font-semibold font-body text-warning-text">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-fill opacity-60" style={{ animationDuration: "2s" }} />
            <span className="relative size-1.5 rounded-full bg-amber-fill" />
          </span>
          Monitoring
        </span>
      ) : null}

      <div className="shrink-0">
        <SegmentedControl
          label="Role"
          value={role}
          onChange={(next) => {
            setRole(next);
            window.localStorage.setItem("keplerlearn:last-role", next);
            window.dispatchEvent(new CustomEvent("keplerlearn:role-change", { detail: next }));
          }}
          options={[
            { value: "student", label: "Student" },
            { value: "teacher", label: "Teacher" },
          ]}
        />
      </div>
    </nav>
  );
}
