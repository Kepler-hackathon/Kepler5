"use client";

import * as React from "react";
import { WidgetSlot } from "@/components/widgets/widget-slot";
import { Checkbox } from "@/components/ui/checkbox";
import { apiJson, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import type { ApiGeneratedItem } from "./types";

function previewText(item: ApiGeneratedItem): string {
  const c = item.content;
  if (typeof c.promptMd === "string") return c.promptMd;
  if (typeof c.explanationMd === "string") return c.explanationMd;
  if (typeof c.text === "string") return c.text;
  return "No preview available.";
}

/** One generated quiz/widget row (Screen 8, Stage 4) — WidgetSlot preview + a checkbox
 * defaulted to checked ("Approved"); unchecking marks it Discarded via
 * PATCH /api/generated-items/[id]. */
export function ReviewItemCard({ item, sourceLectureTitle }: { item: ApiGeneratedItem; sourceLectureTitle: string }) {
  const [status, setStatus] = React.useState(item.status);
  const [busy, setBusy] = React.useState(false);
  const toast = useToast();
  const approved = status === "approved" || status === "published";

  async function toggle(checked: boolean) {
    const next = checked ? "approved" : "discarded";
    const prev = status;
    setStatus(next);
    setBusy(true);
    try {
      await apiJson(`/api/generated-items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
    } catch (err) {
      setStatus(prev);
      toast.push({ message: err instanceof ApiError ? err.message : "Failed to update item" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-hairline bg-surface-card p-4">
      <Checkbox checked={approved} onCheckedChange={toggle} disabled={busy} aria-label={`Approve ${item.type}`} className="mt-1" />
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-[12px] text-muted font-body">{sourceLectureTitle}</p>
        <WidgetSlot
          typeBadge={item.type}
          title={item.conceptLabel ?? (item.type === "quiz" ? "Quiz question" : "Widget")}
          explanation={previewText(item)}
          size="compact"
        />
      </div>
    </div>
  );
}
