"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, TextInput, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiJson, ApiError } from "@/lib/api-client";
import type { ModuleOption } from "./forum";
import type { FaqThreadRow } from "./questions-tab";

const TITLE_MAX = 150;

interface TagTree {
  module: { id: string; name: string };
  lectures: { id: string; title: string; slides: { id: string; index: number }[] }[];
}

export function ForumComposeDialog({ modules, onPost }: { modules: ModuleOption[]; onPost: (thread: FaqThreadRow) => void }) {
  const [open, setOpen] = React.useState(false);
  const [moduleId, setModuleId] = React.useState("");
  const [lectureId, setLectureId] = React.useState("");
  const [slideId, setSlideId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [tagTree, setTagTree] = React.useState<TagTree | null>(null);
  const [tagTreeLoading, setTagTreeLoading] = React.useState(false);
  const toast = useToast();

  const canPost = moduleId !== "" && title.trim().length > 0 && body.trim().length > 0 && !posting;

  React.useEffect(() => {
    if (!moduleId) {
      setTagTree(null);
      setLectureId("");
      setSlideId("");
      return;
    }
    let cancelled = false;
    setTagTreeLoading(true);
    setLectureId("");
    setSlideId("");
    apiJson<TagTree>(`/api/faq/tag-tree?moduleId=${moduleId}`)
      .then((tree) => { if (!cancelled) setTagTree(tree); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTagTreeLoading(false); });
    return () => { cancelled = true; };
  }, [moduleId]);

  const selectedLecture = tagTree?.lectures.find((l) => l.id === lectureId) ?? null;

  function requestClose(next: boolean) {
    if (!next && (title.trim() || body.trim())) {
      if (!window.confirm("Discard this question?")) return;
    }
    setOpen(next);
    if (!next) {
      setModuleId("");
      setLectureId("");
      setSlideId("");
      setTitle("");
      setBody("");
      setTagTree(null);
    }
  }

  async function submit() {
    setPosting(true);
    try {
      const thread = await apiJson<FaqThreadRow>("/api/faq/threads", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          bodyMd: body.trim(),
          tagModuleId: moduleId,
          tagLectureId: lectureId || null,
          tagSlideId: slideId || null,
        }),
      });
      requestClose(false);
      onPost(thread);
      toast.push({ message: "Question posted" });
    } catch (err) {
      toast.push({ message: err instanceof ApiError ? err.message : "Failed to post question" });
    } finally {
      setPosting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogTrigger asChild>
        <Button variant="primary">+ Ask Question</Button>
      </DialogTrigger>
      <DialogContent title="Ask a question">
        <div className="space-y-4">
          {/* Step 1: Module */}
          <Field label="Module" htmlFor="compose-module">
            <select
              id="compose-module"
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="w-full rounded-[var(--radius-control)] border border-hairline bg-canvas px-3 py-2 text-[14px] text-ink font-body"
            >
              <option value="">Select…</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </Field>

          {/* Step 2: Lecture (optional) */}
          {moduleId && (
            <Field label="Lecture (optional)" htmlFor="compose-lecture">
              {tagTreeLoading ? (
                <p className="text-[13px] text-muted font-body">Loading lectures…</p>
              ) : (
                <select
                  id="compose-lecture"
                  value={lectureId}
                  onChange={(e) => { setLectureId(e.target.value); setSlideId(""); }}
                  className="w-full rounded-[var(--radius-control)] border border-hairline bg-canvas px-3 py-2 text-[14px] text-ink font-body"
                >
                  <option value="">All lectures in module</option>
                  {tagTree?.lectures.map((l) => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              )}
            </Field>
          )}

          {/* Step 3: Slide grid (optional) */}
          {lectureId && selectedLecture && selectedLecture.slides.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-medium font-body text-muted">
                Slide (optional)
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSlideId("")}
                  className={`rounded-full border px-3 py-1 text-[13px] font-medium font-body transition-colors ${
                    slideId === ""
                      ? "border-accent-text/50 bg-surface-card text-ink"
                      : "border-hairline text-muted hover:text-ink"
                  }`}
                >
                  All slides
                </button>
                {selectedLecture.slides.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSlideId(s.id)}
                    className={`rounded-full border px-3 py-1 text-[13px] font-medium font-body transition-colors ${
                      slideId === s.id
                        ? "border-accent-text/50 bg-accent-text text-white"
                        : "border-hairline text-muted hover:text-ink"
                    }`}
                  >
                    Slide {s.index + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Field label="Title" htmlFor="compose-title" hint={`${title.length}/${TITLE_MAX}`}>
            <TextInput id="compose-title" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
          <Field label="Details (Markdown)" htmlFor="compose-body">
            <Textarea id="compose-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} required />
          </Field>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="ghost" onClick={() => requestClose(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!canPost}
              disabledReason="Pick a module and add a title and details"
              onClick={submit}
            >
              {posting ? "Posting…" : "Post"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
