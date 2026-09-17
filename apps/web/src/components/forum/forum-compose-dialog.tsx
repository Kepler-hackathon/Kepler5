"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, TextInput, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { moduleDetails } from "@/lib/data/curriculum";

const TITLE_MAX = 150;

/**
 * Forum compose (frontend plan S2): from the forum, tagging is two dropdowns
 * (Module required, Lecture optional) rather than the slide-prefilled chip S4 uses.
 */
export function ForumComposeDialog({ onPost }: { onPost: (title: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [moduleId, setModuleId] = React.useState("");
  const [lectureNumber, setLectureNumber] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const toast = useToast();

  const selectedModule = moduleDetails.find((m) => m.id === moduleId);
  const canPost = moduleId !== "" && title.trim().length > 0 && body.trim().length > 0;

  function requestClose(next: boolean) {
    if (!next && (title.trim() || body.trim())) {
      if (!window.confirm("Discard this question?")) return;
    }
    setOpen(next);
    if (!next) {
      setModuleId("");
      setLectureNumber("");
      setTitle("");
      setBody("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogTrigger asChild>
        <Button variant="primary">+ Ask Question</Button>
      </DialogTrigger>
      <DialogContent title="Ask a question">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Module" htmlFor="compose-module">
              <select
                id="compose-module"
                value={moduleId}
                onChange={(e) => {
                  setModuleId(e.target.value);
                  setLectureNumber("");
                }}
                className="w-full rounded-[var(--radius-control)] border border-hairline bg-canvas px-3 py-2 text-[14px] text-ink font-body"
              >
                <option value="">Select…</option>
                {moduleDetails.map((m) => (
                  <option key={m.id} value={m.id}>
                    Module {m.number}: {m.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Lecture (optional)" htmlFor="compose-lecture">
              <select
                id="compose-lecture"
                value={lectureNumber}
                onChange={(e) => setLectureNumber(e.target.value)}
                disabled={!selectedModule}
                className="w-full rounded-[var(--radius-control)] border border-hairline bg-canvas px-3 py-2 text-[14px] text-ink font-body disabled:opacity-50"
              >
                <option value="">Whole module</option>
                {selectedModule?.lectures.map((l) => (
                  <option key={l.number} value={l.number}>
                    Lecture {l.number}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Title" htmlFor="compose-title" hint={`${title.length}/${TITLE_MAX}`}>
            <TextInput id="compose-title" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
          <Field label="Details" htmlFor="compose-body">
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
              onClick={() => {
                requestClose(false);
                onPost(title.trim());
                toast.push({ message: `Posted to ${selectedModule?.title ?? "the forum"}` });
              }}
            >
              Post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
