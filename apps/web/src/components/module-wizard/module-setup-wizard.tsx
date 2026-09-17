"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AppNav } from "@/components/nav/app-nav";
import { useToast } from "@/components/ui/toast";
import { apiJson, ApiError } from "@/lib/api-client";
import { WizardStepper } from "./wizard-stepper";
import { Stage1DetailsUpload, type Stage1State } from "./stage1-details-upload";
import { Stage2AiOptIn } from "./stage2-ai-opt-in";
import { Stage3Processing } from "./stage3-processing";
import { Stage4ReviewPublish } from "./stage4-review-publish";
import type { ApiLecture, ApiModuleFull, WizardAnchor } from "./types";

const ANCHOR_KINDS = ["textbook", "problem_bank"] as const;

interface ApiCourse {
  id: string;
  code: string | null;
  name: string;
}

function emptyStage1(moduleId: string | null): Stage1State {
  return { moduleId, name: "", overviewMd: "", scheduleNotes: "", objectives: [], lectures: [], anchors: [] };
}

/** Owns all lifted wizard state; stage position lives in ?stage=1..4 so refresh/back-button
 * behave sanely without remounting the tree (stage components are conditional siblings, not
 * separate routes) — this is what makes Stage 1/2 edits survive navigation between them
 * (Screen 8's Navigation Rules). */
export function ModuleSetupWizard({ courseId, moduleId: initialModuleId }: { courseId: string; moduleId: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [course, setCourse] = React.useState<ApiCourse | null>(null);
  const [loading, setLoading] = React.useState(!!initialModuleId);
  const [saving, setSaving] = React.useState(false);
  const [stage1, setStage1] = React.useState<Stage1State>(emptyStage1(initialModuleId));
  const [aiOptIn, setAiOptIn] = React.useState(false);
  const [itemsPerLecture, setItemsPerLecture] = React.useState(3);

  const stageParam = Number(searchParams.get("stage"));
  const stage = ([1, 2, 3, 4] as const).includes(stageParam as 1 | 2 | 3 | 4) ? (stageParam as 1 | 2 | 3 | 4) : 1;

  React.useEffect(() => {
    apiJson<{ courses: ApiCourse[] }>("/api/courses")
      .then((d) => setCourse(d.courses.find((c) => c.id === courseId) ?? null))
      .catch(() => {});
  }, [courseId]);

  function goToStage(s: 1 | 2 | 3 | 4, targetModuleId?: string) {
    const base = targetModuleId ? `/course/${courseId}/module/${targetModuleId}/wizard` : pathname;
    router.replace(`${base}?stage=${s}`);
  }

  // Resume: hydrate from server state for an existing module.
  React.useEffect(() => {
    if (!initialModuleId) return;
    let cancelled = false;
    (async () => {
      try {
        const [mod, lectures, anchorsResp] = await Promise.all([
          apiJson<ApiModuleFull>(`/api/modules/${initialModuleId}`),
          apiJson<ApiLecture[]>(`/api/modules/${initialModuleId}/lectures`),
          apiJson<{ anchors: Array<{ id: string; fileId: string; kind: "textbook" | "problem_bank"; fileName: string }> }>(
            `/api/modules/${initialModuleId}/anchors`
          ).catch(() => ({ anchors: [] })),
        ]);
        if (cancelled) return;

        if (mod.status === "published") {
          router.replace(`/course/${courseId}/module/${initialModuleId}`);
          return;
        }

        setStage1({
          moduleId: initialModuleId,
          name: mod.name,
          overviewMd: mod.overviewMd ?? "",
          scheduleNotes: mod.scheduleNotes ?? "",
          objectives: mod.objectives,
          lectures: lectures.map((l) => ({
            key: crypto.randomUUID(),
            lectureId: l.id,
            title: l.title,
            deckFileId: l.deckFileId,
            parseStatus: l.parseStatus,
            pendingFile: null,
            uploadPhase: l.deckFileId ? "done" : "idle",
            uploadError: null,
          })),
          anchors: ANCHOR_KINDS.map((kind): WizardAnchor | null => {
            const row = anchorsResp.anchors.find((a) => a.kind === kind);
            return row
              ? { id: row.id, fileId: row.fileId, kind, fileName: row.fileName, pendingFile: null, uploadPhase: "done", uploadError: null }
              : null;
          }).filter((a): a is WizardAnchor => a !== null),
        });
        setAiOptIn(mod.aiOptIn);
        setItemsPerLecture(mod.itemsPerLecture);

        if (!searchParams.get("stage")) {
          if (mod.status === "ready_to_review") goToStage(4);
          else if (mod.status === "processing" || mod.status === "needs_attention") goToStage(3);
          else if (lectures.length > 0) goToStage(2);
          else goToStage(1);
        }
      } catch (err) {
        toast.push({ message: err instanceof ApiError ? err.message : "Failed to load module" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialModuleId]);

  async function saveStage1AndAdvance() {
    setSaving(true);
    try {
      const payload = {
        name: stage1.name.trim(),
        overviewMd: stage1.overviewMd.trim() || null,
        objectives: stage1.objectives.map((o) => o.trim()).filter(Boolean),
        scheduleNotes: stage1.scheduleNotes.trim() || null,
      };

      let id = stage1.moduleId;
      if (!id) {
        const mod = await apiJson<ApiModuleFull>("/api/modules", {
          method: "POST",
          body: JSON.stringify({ courseId, ...payload }),
        });
        id = mod.id;
      } else {
        await apiJson(`/api/modules/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      }

      const lectureBody = stage1.lectures.map((l) => ({
        lectureId: l.lectureId ?? undefined,
        fileId: l.deckFileId ?? undefined,
        title: l.title.trim(),
      }));
      const updated = await apiJson<ApiLecture[]>(`/api/modules/${id}/lectures`, {
        method: "PUT",
        body: JSON.stringify(lectureBody),
      });

      const newAnchors = stage1.anchors.filter((a) => a.fileId && !a.id);
      for (const a of newAnchors) {
        await apiJson(`/api/modules/${id}/anchors`, { method: "POST", body: JSON.stringify({ fileId: a.fileId, kind: a.kind }) });
      }

      setStage1((prev) => ({
        ...prev,
        moduleId: id!,
        lectures: prev.lectures.map((l, i) => ({ ...l, lectureId: updated[i]?.id ?? l.lectureId })),
      }));

      goToStage(2, stage1.moduleId ? undefined : id!);
    } catch (err) {
      toast.push({ message: err instanceof ApiError ? err.message : "Failed to save module" });
    } finally {
      setSaving(false);
    }
  }

  async function saveStage2AndAdvance() {
    if (!stage1.moduleId) return;
    setSaving(true);
    try {
      await apiJson(`/api/modules/${stage1.moduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ aiOptIn, itemsPerLecture }),
      });
      goToStage(3);
    } catch (err) {
      toast.push({ message: err instanceof ApiError ? err.message : "Failed to save AI settings" });
    } finally {
      setSaving(false);
    }
  }

  const locked = stage >= 3;
  const lectureTitles = Object.fromEntries(stage1.lectures.filter((l) => l.lectureId).map((l) => [l.lectureId!, l.title]));
  const publishedLectures = stage1.lectures.filter((l) => l.lectureId).map((l) => ({ id: l.lectureId!, title: l.title }));

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas">
        <AppNav courseId={courseId} course={course ? { code: course.code, title: course.name } : null} activeHref={`/course/${courseId}`} />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <p className="text-[15px] text-muted font-body">Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav courseId={courseId} course={course ? { code: course.code, title: course.name } : null} activeHref={`/course/${courseId}`} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[13px] font-medium font-body uppercase tracking-[1px] text-accent-text">Module Setup</p>
        <h1 className="mt-1">{stage1.name || "New module"}</h1>

        <div className="mt-6">
          <WizardStepper stage={stage} locked={locked} onNavigate={(s) => goToStage(s)} />
        </div>

        <div className="mt-8">
          {stage === 1 ? (
            <Stage1DetailsUpload state={stage1} setState={setStage1} onNext={saveStage1AndAdvance} saving={saving} />
          ) : null}
          {stage === 2 ? (
            <Stage2AiOptIn
              aiOptIn={aiOptIn}
              itemsPerLecture={itemsPerLecture}
              onChange={(p) => {
                if (p.aiOptIn !== undefined) setAiOptIn(p.aiOptIn);
                if (p.itemsPerLecture !== undefined) setItemsPerLecture(p.itemsPerLecture);
              }}
              onBack={() => goToStage(1)}
              onNext={saveStage2AndAdvance}
              saving={saving}
            />
          ) : null}
          {stage === 3 && stage1.moduleId ? (
            <Stage3Processing
              moduleId={stage1.moduleId}
              aiOptIn={aiOptIn}
              lectureTitles={lectureTitles}
              onCancelled={() => goToStage(2)}
              onDone={() => goToStage(4)}
            />
          ) : null}
          {stage === 4 && stage1.moduleId ? (
            <Stage4ReviewPublish
              courseId={courseId}
              moduleId={stage1.moduleId}
              moduleName={stage1.name}
              aiOptIn={aiOptIn}
              lectures={publishedLectures}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
