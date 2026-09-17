"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, TextInput, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TITLE_MAX = 80;
const NOTE_MAX = 280;

/**
 * Publish dialog (frontend plan §5 / Part III §3): the spec has no dedicated screen for
 * this, but S2/S10 need a title and notes, so it's designed here where it's triggered.
 */
export function PublishDialog({
  trigger,
  defaultTitle,
  slideLabel,
  onPublish,
}: {
  trigger: React.ReactNode;
  defaultTitle: string;
  slideLabel: string;
  onPublish: (title: string, note: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(defaultTitle);
  const [note, setNote] = React.useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Publish to Class Community">
        <div className="space-y-4">
          <Field label="Title" htmlFor="publish-title" hint={`${title.length}/${TITLE_MAX}`}>
            <TextInput
              id="publish-title"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Field>
          <Field label="Note (optional)" htmlFor="publish-note" hint={`${note.length}/${NOTE_MAX}`}>
            <Textarea
              id="publish-note"
              rows={3}
              maxLength={NOTE_MAX}
              placeholder="Anything worth telling classmates about this explanation?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <p className="text-[13px] text-muted font-body">
            Will be tagged to <span className="font-medium text-ink">{slideLabel}</span>.
          </p>
          <p className="text-[13px] text-warning-text font-body">Publishing can&rsquo;t be undone.</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={title.trim().length === 0}
              disabledReason="Add a title before publishing"
              onClick={() => {
                onPublish(title.trim(), note.trim());
                setOpen(false);
              }}
            >
              Publish
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
