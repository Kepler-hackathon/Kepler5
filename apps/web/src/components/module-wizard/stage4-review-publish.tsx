"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiJson, ApiError } from "@/lib/api-client";
import { ReviewItemCard } from "./review-item-card";
import { LectureFlowPreview } from "./lecture-flow-preview";
import type { ApiReviewLecture } from "./types";

/** Screen 8, Stage 4 — summary, generated-content review list (only if aiOptIn), lecture
 * sequence preview, and the Publish action. Publish gates only on parse status server-side
 * (POST /api/modules/[id]/publish) — this screen doesn't add its own gate on top. */
export function Stage4ReviewPublish({
  courseId,
  moduleId,
  moduleName,
  aiOptIn,
  lectures,
}: {
  courseId: string;
  moduleId: string;
  moduleName: string;
  aiOptIn: boolean;
  lectures: Array<{ id: string; title: string }>;
}) {
  const [reviewLectures, setReviewLectures] = React.useState<ApiReviewLecture[] | null>(null);
  const [publishing, setPublishing] = React.useState(false);
  const toast = useToast();
  const router = useRouter();

  React.useEffect(() => {
    if (!aiOptIn) return;
    apiJson<{ lectures: ApiReviewLecture[] }>(`/api/modules/${moduleId}/review-items`)
      .then((d) => setReviewLectures(d.lectures))
      .catch(() => setReviewLectures([]));
  }, [moduleId, aiOptIn]);

  const totalItems = reviewLectures?.reduce((n, l) => n + l.items.length, 0) ?? 0;

  async function publish() {
    setPublishing(true);
    try {
      await apiJson(`/api/modules/${moduleId}/publish`, { method: "POST", body: JSON.stringify({}) });
      toast.push({ message: "Module published · students can now access it" });
      router.push(`/course/${courseId}`);
    } catch (err) {
      toast.push({ message: err instanceof ApiError ? err.message : "Failed to publish module" });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px]">Review &amp; Publish: {moduleName}</h2>
        <p className="mt-1 text-[14px] text-muted font-body">
          {lectures.length} lecture{lectures.length === 1 ? "" : "s"} parsed
          {aiOptIn ? ` · ${totalItems} quiz${totalItems === 1 ? "" : "zes"} & widgets generated` : ""}
        </p>
      </div>

      <LectureFlowPreview lectures={lectures} />

      {aiOptIn ? (
        reviewLectures === null ? (
          <p className="text-[14px] text-muted font-body">Loading generated content…</p>
        ) : totalItems === 0 ? (
          <p className="text-[14px] text-muted font-body">No items were generated for this module.</p>
        ) : (
          <div className="space-y-3">
            {reviewLectures.flatMap((l) =>
              l.items.map((item) => <ReviewItemCard key={item.id} item={item} sourceLectureTitle={l.title} />)
            )}
          </div>
        )
      ) : (
        <p className="text-[14px] text-muted font-body">No AI practice content was generated for this module.</p>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="primary" onClick={publish} disabled={publishing}>
          {publishing ? "Publishing…" : "Publish Module"}
        </Button>
      </div>
    </div>
  );
}
