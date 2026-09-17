"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { FaqTab } from "./faq-tab";
import { CopilotTab } from "@/components/copilot/copilot-tab";

export function Sidebar({
  slideNumber,
  lectureNumber,
  moduleId,
  lectureId,
  slideId,
}: {
  slideNumber: number;
  lectureNumber: number;
  moduleId: string;
  lectureId: string;
  slideId: string | null;
}) {
  const [tab, setTab] = React.useState<"faq" | "ai">("faq");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab switcher */}
      <div className="flex shrink-0 border-b border-hairline">
        <button
          type="button"
          onClick={() => setTab("faq")}
          className={cn(
            "flex-1 py-2.5 text-[12px] font-semibold font-body uppercase tracking-[0.5px] transition-colors",
            tab === "faq"
              ? "text-ink border-b-2 border-button-primary"
              : "text-muted hover:text-ink"
          )}
        >
          Slide FAQ
        </button>
        <button
          type="button"
          onClick={() => setTab("ai")}
          className={cn(
            "flex-1 py-2.5 text-[12px] font-semibold font-body uppercase tracking-[0.5px] transition-colors",
            tab === "ai"
              ? "text-ink border-b-2 border-button-primary"
              : "text-muted hover:text-ink"
          )}
        >
          AI Tutor
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "faq" ? (
          <FaqTab
            moduleId={moduleId}
            lectureId={lectureId}
            slideId={slideId}
            slideNumber={slideNumber}
            lectureNumber={lectureNumber}
          />
        ) : (
          <CopilotTab
            lectureId={lectureId}
            slideId={slideId ?? undefined}
            slideNumber={slideNumber}
            lectureNumber={lectureNumber}
          />
        )}
      </div>
    </div>
  );
}
