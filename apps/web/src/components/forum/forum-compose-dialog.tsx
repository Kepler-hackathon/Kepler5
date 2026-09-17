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

/**
 * Forum compose (frontend plan S2): from the forum, tagging is a Module dropdown
 * (required) — real threads are tagged at module level here; lecture/slide-level tagging
 * happens from within the slide viewer.
 */
export function ForumComposeDialog({ modules, onPost }: { modules: ModuleOption[]; onPost: (thread: FaqThreadRow) => void }) {
  const [open, setOpen] = React.useState(false);
  const [moduleId, setModuleId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const toast = useToast();

  const canPost = moduleId !== "" && title.trim().length > 0 && body.trim().length > 0 && !posting;

  function requestClose(next: boolean) {
    if (!next && (title.trim() || body.trim())) {
      if (!window.confirm("Discard this question?")) return;
    }
    setOpen(next);
    if (!next) {
      setModuleId("");
      setTitle("");
      setBody("");
    }
  }

  async function submit() {
    setPosting(true);
    try {
      const thread = await apiJson<FaqThreadRow>("/api/faq/threads", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), bodyMd: body.trim(), tagModuleId: moduleId }),
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
          <Field label="Module" htmlFor="compose-module">
            <select
              id="compose-module"
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="w-full rounded-[var(--radius-control)] border border-hairline bg-canvas px-3 py-2 text-[14px] text-ink font-body"
            >
              <option value="">Select…</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
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
