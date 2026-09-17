"use client";

import * as React from "react";
import Link from "next/link";
import { ChatCircleDots } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { KeplerMark } from "./kepler-mark";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import { courseById } from "@/lib/data/courses";

/** Global nav shell (frontend plan Part I §5.1). */
export function AppNav({ courseId, activeHref = "/courses" }: { courseId: string; activeHref?: string }) {
  const toast = useToast();
  const [role, setRole] = React.useState<"student" | "teacher">("student");
  const course = courseById(courseId);
  const courseHref = `/course/${courseId}`;

  const studentTabs = [
    { label: "Lectures", href: courseHref },
    { label: "FAQ Forum", href: `${courseHref}/forum` },
    { label: "Practice Quizzes", href: "/quizzes" },
    { label: "My Progress", href: "/progress" },
  ];

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
        {studentTabs.map((tab) => {
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
      </div>

      <div className="shrink-0">
        <SegmentedControl
          label="Role"
          value={role}
          onChange={(next) => {
            if (next === "teacher") {
              toast.push({ message: "Teacher screens aren't part of this preview yet." });
              return;
            }
            setRole(next);
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
