"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { TagChip } from "@/components/ui/badges";
import { Field, TextInput, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const TITLE_MAX = 150;

/**
 * "+ Ask Question" compose entry point (frontend plan §7.2). The Tag Picker itself is
 * deferred — from a slide the tag arrives pre-filled and read-only, which is the one
 * path this build needs; the Module/Lecture dropdown picker lives in Screen 2 (Track B).
 */
export function ComposeQuestionDialog({ slideNumber, lectureNumber }: { slideNumber: number; lectureNumber: number }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const toast = useToast();

  function requestClose(next: boolean) {
    if (!next && (title.trim() || body.trim())) {
      const confirmed = window.confirm("Discard this question?");
      if (!confirmed) return;
    }
    setOpen(next);
    if (!next) {
      setTitle("");
      setBody("");
    }
  }

  const canPost = title.trim().length > 0 && body.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogTrigger asChild>
        <Button variant="primary" size="sm" className="w-full">
          + Ask Question
        </Button>
      </DialogTrigger>
      <DialogContent title="Ask a question">
        <div className="space-y-4">
          <TagChip label={`Slide ${slideNumber} · Lecture ${lectureNumber}`} />
          <Field label="Title" htmlFor="q-title" hint={`${title.length}/${TITLE_MAX}`}>
            <TextInput id="q-title" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
          <Field label="Details" htmlFor="q-body">
            <Textarea id="q-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} required />
          </Field>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="ghost" onClick={() => requestClose(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!canPost}
              disabledReason="Add a title and details before posting"
              onClick={() => {
                setOpen(false);
                setTitle("");
                setBody("");
                toast.push({ message: `Posted to Slide ${slideNumber} · Recursion` });
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
