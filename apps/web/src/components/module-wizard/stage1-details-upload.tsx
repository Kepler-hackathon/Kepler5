"use client";

import * as React from "react";
import { Field, TextInput, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ObjectivesInput } from "./objectives-input";
import { DeckDropzone } from "./deck-dropzone";
import { LectureSequenceList } from "./lecture-sequence-list";
import { KnowledgeAnchorDropzone } from "./knowledge-anchor-dropzone";
import { uploadFile, uploadErrorMessage, withConcurrency } from "./hooks/use-deck-upload";
import type { WizardAnchor, WizardLecture } from "./types";

function titleFromFileName(name: string): string {
  return name.replace(/\.(pdf|pptx)$/i, "");
}

export interface Stage1State {
  moduleId: string | null;
  name: string;
  overviewMd: string;
  scheduleNotes: string;
  objectives: string[];
  lectures: WizardLecture[];
  anchors: WizardAnchor[];
}

/** Screen 8, Stage 1 — module outline fields + bulk deck dropzone + lecture sequencing +
 * optional knowledge-base anchors. Deck/anchor uploads start immediately on file selection
 * (moduleId isn't required until the lectures/anchors are actually attached on "Next"), so the
 * teacher isn't blocked waiting on each file before moving to the next field. */
export function Stage1DetailsUpload({
  state,
  setState,
  onNext,
  saving,
}: {
  state: Stage1State;
  setState: React.Dispatch<React.SetStateAction<Stage1State>>;
  onNext: () => void;
  saving: boolean;
}) {
  function patch(partial: Partial<Stage1State>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  function updateLecture(key: string, partial: Partial<WizardLecture>) {
    setState((prev) => ({
      ...prev,
      lectures: prev.lectures.map((l) => (l.key === key ? { ...l, ...partial } : l)),
    }));
  }

  async function handleFiles(files: File[]) {
    const rows: WizardLecture[] = files.map((file) => ({
      key: crypto.randomUUID(),
      lectureId: null,
      title: titleFromFileName(file.name),
      deckFileId: null,
      parseStatus: null,
      pendingFile: file,
      uploadPhase: "idle",
      uploadError: null,
    }));
    setState((prev) => ({ ...prev, lectures: [...prev.lectures, ...rows] }));

    await withConcurrency(rows, 3, async (row) => {
      updateLecture(row.key, { uploadPhase: "uploading" });
      try {
        const { fileId } = await uploadFile(row.pendingFile!, "deck", state.moduleId);
        updateLecture(row.key, { uploadPhase: "done", deckFileId: fileId, pendingFile: null });
      } catch (err) {
        updateLecture(row.key, { uploadPhase: "error", uploadError: uploadErrorMessage(err) });
      }
    });
  }

  async function handleAnchorSelect(kind: "textbook" | "problem_bank", file: File) {
    const key = kind;
    setState((prev) => ({
      ...prev,
      anchors: [
        ...prev.anchors.filter((a) => a.kind !== kind),
        { id: null, fileId: null, kind, fileName: file.name, pendingFile: file, uploadPhase: "uploading", uploadError: null },
      ],
    }));
    try {
      const { fileId } = await uploadFile(file, kind, state.moduleId);
      setState((prev) => ({
        ...prev,
        anchors: prev.anchors.map((a) =>
          a.kind === key ? { ...a, uploadPhase: "done", fileId, pendingFile: null } : a
        ),
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        anchors: prev.anchors.map((a) => (a.kind === key ? { ...a, uploadPhase: "error", uploadError: uploadErrorMessage(err) } : a)),
      }));
    }
  }

  const uploading = state.lectures.some((l) => l.uploadPhase === "uploading") || state.anchors.some((a) => a.uploadPhase === "uploading");
  const canNext =
    state.name.trim().length > 0 &&
    state.lectures.length > 0 &&
    state.lectures.every((l) => l.title.trim().length > 0 && l.uploadPhase !== "error") &&
    !uploading;

  return (
    <div className="space-y-6">
      <Field label="Module name" htmlFor="wiz-name">
        <TextInput
          id="wiz-name"
          value={state.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Module 3: Trees & Recursion"
          disabled={saving}
        />
      </Field>

      <Field label="Overview / description" htmlFor="wiz-overview" hint="Markdown">
        <Textarea
          id="wiz-overview"
          rows={4}
          value={state.overviewMd}
          onChange={(e) => patch({ overviewMd: e.target.value })}
          placeholder="What this module covers…"
          disabled={saving}
        />
      </Field>

      <div>
        <p className="mb-1.5 text-[13px] font-medium font-body text-ink">Learning objectives</p>
        <ObjectivesInput value={state.objectives} onChange={(objectives) => patch({ objectives })} />
      </div>

      <Field label="Schedule notes" htmlFor="wiz-schedule" hint="Optional">
        <Textarea
          id="wiz-schedule"
          rows={2}
          value={state.scheduleNotes}
          onChange={(e) => patch({ scheduleNotes: e.target.value })}
          disabled={saving}
        />
      </Field>

      <div>
        <p className="mb-1.5 text-[13px] font-medium font-body text-ink">Lecture decks</p>
        <DeckDropzone disabled={saving} onFiles={handleFiles} />
        <div className="mt-3">
          <LectureSequenceList lectures={state.lectures} onChange={(lectures) => patch({ lectures })} />
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[13px] font-medium font-body text-ink">Knowledge base anchors (optional)</p>
        <div className="space-y-2">
          <KnowledgeAnchorDropzone
            kind="textbook"
            anchor={state.anchors.find((a) => a.kind === "textbook") ?? null}
            disabled={saving}
            onSelect={(file) => handleAnchorSelect("textbook", file)}
          />
          <KnowledgeAnchorDropzone
            kind="problem_bank"
            anchor={state.anchors.find((a) => a.kind === "problem_bank") ?? null}
            disabled={saving}
            onSelect={(file) => handleAnchorSelect("problem_bank", file)}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          onClick={onNext}
          disabled={!canNext || saving}
          disabledReason={uploading ? "Wait for uploads to finish" : "Enter a module name and attach at least one lecture"}
        >
          {saving ? "Saving…" : "Next: AI Content"}
        </Button>
      </div>
    </div>
  );
}
