"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiJson, ApiError } from "@/lib/api-client";

interface ApiCourse {
  id: string;
  code: string | null;
  name: string;
  term: string | null;
  instructorName: string | null;
}

/** Shared by the empty-state CTA and the populated grid's trailing "+ New Course" card —
 * both just supply a different trigger element and reuse this one create flow. */
export function CreateCourseDialog({
  trigger,
  onCreated,
}: {
  trigger: React.ReactNode;
  onCreated: (course: ApiCourse) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const toast = useToast();

  function requestClose(next: boolean) {
    if (!next && name.trim() && !creating) {
      if (!window.confirm("Discard this course?")) return;
    }
    setOpen(next);
    if (!next) setName("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const course = await apiJson<ApiCourse>("/api/courses", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      setOpen(false);
      setName("");
      onCreated(course);
    } catch (err) {
      toast.push({ message: err instanceof ApiError ? err.message : "Failed to create course" });
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Create course">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Course name" htmlFor="new-course-name">
            <TextInput
              id="new-course-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CS 106B: Programming Abstractions"
              autoFocus
              required
            />
          </Field>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={() => requestClose(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={creating || !name.trim()}
              disabledReason="Enter a course name"
            >
              {creating ? "Creating…" : "Create course"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
