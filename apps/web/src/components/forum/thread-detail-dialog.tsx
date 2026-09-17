"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ForumThread } from "@/lib/data/forum";

/** Thread detail (frontend plan S2, D5 — gap in spec, resolved as a panel over the feed). */
export function ThreadDetailDialog({ thread, open, onOpenChange }: { thread: ForumThread | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [reply, setReply] = React.useState("");
  const toast = useToast();
  if (!thread) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={thread.title} className="max-w-lg">
        <div className="flex items-center gap-2">
          <Avatar name={thread.author} size="sm" />
          <span className="text-[13px] text-muted font-body">
            {thread.author} · {thread.timeAgo}
          </span>
          {thread.endorsed ? <StatusIndicator kind="done" label="Instructor endorsed" className="ml-2" /> : null}
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-body font-body">{thread.body}</p>

        <div className="mt-5 border-t border-hairline pt-4">
          <p className="text-[13px] font-medium font-body text-muted">
            {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
          </p>
          {thread.replyCount === 0 ? (
            <p className="mt-2 text-[13px] text-muted font-body">No replies yet.</p>
          ) : (
            <p className="mt-2 text-[13px] text-muted font-body italic">Replies aren&rsquo;t part of this preview yet.</p>
          )}
        </div>

        <div className="mt-4">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            placeholder="Write a reply…"
          />
          <div className="mt-2 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              disabled={!reply.trim()}
              onClick={() => {
                setReply("");
                toast.push({ message: "Reply posted" });
              }}
            >
              Reply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
