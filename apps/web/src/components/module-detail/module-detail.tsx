"use client";

import * as React from "react";
import { CaretRight } from "@phosphor-icons/react";
import { AppNav } from "@/components/nav/app-nav";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatusGlyph } from "@/components/ui/status-indicator";
import { cn } from "@/lib/cn";
import { LectureRow } from "./lecture-row";
import type { Course } from "@/lib/data/types";
import type { ModuleDetail as ModuleDetailData } from "@/lib/data/curriculum";

export function ModuleDetail({ course, module }: { course: Course; module: ModuleDetailData }) {
  const [view, setView] = React.useState<"list" | "flow">("list");
  const [overviewExpanded, setOverviewExpanded] = React.useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav courseId={course.id} activeHref={`/course/${course.id}`} />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[13px] font-medium font-body uppercase tracking-[1px] text-accent-text">
          Module {module.number}
        </p>
        <h1 className="mt-1">{module.title}</h1>

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
            </div>
          ) : (
            <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
              {module.lectures.map((l, i) => (
                <div key={l.number} className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center lg:gap-3">
                  <div className="flex w-full items-center gap-3 rounded-[var(--radius-control)] border border-hairline bg-surface-card px-4 py-3 lg:w-56">
                    <StatusGlyph
                      kind={l.status === "done" ? "done" : l.status === "in-progress" ? "in-progress" : "not-started"}
                      label={l.status}
                    />
                    <span className="line-clamp-2 text-[14px] font-medium font-body text-ink">
                      {l.number}. {l.title}
                    </span>
                  </div>
                  {i < module.lectures.length - 1 ? (
                    <CaretRight className="mx-auto size-4 rotate-90 text-hairline lg:mx-0 lg:rotate-0" aria-hidden />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
