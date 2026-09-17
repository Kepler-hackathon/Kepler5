"use client";

import * as React from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { SkeletonWidget } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TraceStepperWidget } from "@/components/widgets/trace-stepper-widget";
import { SparkGlyph } from "@/components/ui/status-icons";
import { PublishDialog } from "./publish-dialog";
import { useGenerationTiming } from "@/lib/ai/simulate-stream";
import { useToast } from "@/components/ui/toast";
import type { QuizQuestion } from "@/lib/data/types";

/**
 * Screen 5 — Contextual AI Generation Drawer (frontend plan Part III §3, S5).
 * Non-modal by design (D12): triggered by a wrong quiz answer, the underlying slide
 * stays scrollable and Esc returns focus to the quiz rather than tearing the student
 * out of the lecture.
 *
 * States: skeleton (300ms–8s) · slow (8–45s) · timeout (>45s with retry + fallback)
 * · ready · already-shared (upvote instead) · published.
 */
export function RemediationDrawer({
  open,
  onOpenChange,
  slideLabel,
  question,
  onLoadingChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slideLabel: string;
  /** The question the student just missed. Its explanation is real, question-generation-time
   * AI content (grounded in the actual lecture slide) — showing that instead of a fixed demo
   * widget is what makes this drawer actually about the mistake the student made, not the same
   * unrelated "treeHeight recursion" trace every time (there's no backend step today that
   * generates a fresh interactive widget per-mistake — see docs/ui/screens_breakdown.md
   * Screen 5's latency-handling note, which assumes that step exists; it doesn't yet). */
  question?: QuizQuestion | null;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const [published, setPublished] = React.useState(false);
  const [forceFallback, setForceFallback] = React.useState(false);
  const { tier, ready } = useGenerationTiming(open, { simulatedLatencyMs: 1400 });
  const toast = useToast();

  React.useEffect(() => {
    onLoadingChange?.(!ready && open);
  }, [ready, open, onLoadingChange]);

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setPublished(false);
      setForceFallback(false);
    }
  }

  // Simulate "already shared by someone" for odd-numbered slides (demo only).
  const lastNum = parseInt(slideLabel.replace(/\D/g, ""), 10);
  const alreadySharedBy = !isNaN(lastNum) && lastNum % 2 !== 0 ? "Maya P." : undefined;

  const publishTrigger = alreadySharedBy ? (
    <div className="flex items-center gap-3 rounded-[var(--radius-control)] border border-hairline bg-surface-card px-4 py-2.5">
      <span className="text-[13px] text-muted font-body">
        <span className="font-medium text-ink">{alreadySharedBy}</span> already shared an explanation for this slide.
      </span>
      <Button variant="secondary" size="sm">Upvote it instead</Button>
    </div>
  ) : (
    <PublishDialog
      trigger={<Button variant="primary">Publish to Class Community</Button>}
      defaultTitle="Why treeHeight(nullptr) returns 0"
      slideLabel={slideLabel}
      onPublish={() => {
        setPublished(true);
        toast.push({ message: `Shared with the class · tagged to ${slideLabel}` });
      }}
    />
  );

  let content: React.ReactNode;

  if (!ready && tier === "timeout") {
    content = (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-[15px] text-body font-body">This is taking longer than expected.</p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              onOpenChange(false);
              window.setTimeout(() => onOpenChange(true), 80);
            }}
          >
            Try again
          </Button>
          <Button variant="primary" onClick={() => setForceFallback(true)}>
            Just show me the answer
          </Button>
        </div>
      </div>
    );
  } else if (!ready) {
    content = (
      <SkeletonWidget
        statusLine={
          tier === "slow"
            ? "Still working — this one's taking a moment…"
            : "Crafting an interactive explanation…"
        }
      />
    );
  } else if (forceFallback) {
    content = (
      <div className="space-y-3 py-4">
        <p className="text-[13px] font-medium font-body uppercase tracking-[0.5px] text-muted">Plain explanation</p>
        <p className="text-[15px] leading-relaxed text-body font-body">
          The base case{" "}
          <code className="rounded bg-surface-dark px-1 py-0.5 text-[13px] text-on-dark font-code">
            treeHeight(nullptr)
          </code>{" "}
          returns 0 because an empty tree has no nodes — its height is defined as zero, not negative. Without this
          guard, the recursive calls would dereference a null pointer and crash. The base case is what makes the
          recursion safe.
        </p>
      </div>
    );
  } else if (question) {
    content = (
      <div className="space-y-4 py-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-button-primary px-2.5 py-1 text-[10px] font-semibold font-body uppercase tracking-[1.5px] text-on-primary">
          <SparkGlyph className="size-3" />
          AI generated
        </span>
        <p className="text-[13px] font-medium font-body uppercase tracking-[0.5px] text-muted">Why this answer is correct</p>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-body font-body">
          {question.correctExplanation || "No explanation was generated for this question."}
        </p>
        <div className="flex justify-end pt-2">{publishTrigger}</div>
      </div>
    );
  } else {
    // Defensive fallback for the rare case this drawer opens without a question attached.
    content = (
      <TraceStepperWidget
        published={published}
        publishTrigger={publishTrigger}
      />
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent title="Let&rsquo;s explore this concept interactively.">{content}</DrawerContent>
    </Drawer>
  );
}
