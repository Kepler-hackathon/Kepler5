"use client";

import * as React from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { SkeletonWidget } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TraceStepperWidget } from "@/components/widgets/trace-stepper-widget";
import { PublishDialog } from "./publish-dialog";
import { useGenerationTiming } from "@/lib/ai/simulate-stream";
import { useToast } from "@/components/ui/toast";

/**
 * Screen 5 — Contextual AI Generation Drawer (frontend plan Part III §3, S5).
 * Non-modal by design (D12): triggered by a wrong quiz answer, the underlying slide
 * stays scrollable and Esc returns focus to the quiz rather than tearing the student
 * out of the lecture.
 */
export function RemediationDrawer({
  open,
  onOpenChange,
  slideLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slideLabel: string;
}) {
  const [published, setPublished] = React.useState(false);
  const { tier, ready } = useGenerationTiming(open, { simulatedLatencyMs: 1400 });
  const toast = useToast();

  // Adjust state during render when the drawer closes, rather than in an effect
  // (React's recommended pattern for resetting state in response to a prop change).
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setPublished(false);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent title="Let&rsquo;s explore this concept interactively.">
        {!ready ? (
          <SkeletonWidget
            statusLine={
              tier === "slow"
                ? "Still working — this one's taking a moment…"
                : "Crafting an interactive explanation…"
            }
          />
        ) : (
          <TraceStepperWidget
            published={published}
            publishTrigger={
              <PublishDialog
                trigger={<Button variant="primary">Publish to Class Community</Button>}
                defaultTitle="Why treeHeight(nullptr) returns 0"
                slideLabel={slideLabel}
                onPublish={() => {
                  setPublished(true);
                  toast.push({ message: `Shared with the class · tagged to ${slideLabel}` });
                }}
              />
            }
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
