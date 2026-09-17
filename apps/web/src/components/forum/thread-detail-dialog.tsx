"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiJson, ApiError } from "@/lib/api-client";
import { useIdentity } from "@/lib/identity";
import { displayNameFor } from "@/lib/display-name";
import { timeAgo } from "@/lib/time-ago";
import type { FaqThreadRow } from "./questions-tab";

interface FaqReplyRow {
  id: string;
  authorId: string;
  bodyMd: string;
  isInstructor: boolean;
  createdAt: string;
}

/** Thread detail (frontend plan S2, D5 — gap in spec, resolved as a panel over the feed). */
export function ThreadDetailDialog({
  thread,
  open,
  onOpenChange,
  onReplyPosted,
}: {
  thread: FaqThreadRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplyPosted?: () => void;
}) {
  const identity = useIdentity();
  const [reply, setReply] = React.useState("");
  const [detail, setDetail] = React.useState<(FaqThreadRow & { replies: FaqReplyRow[] }) | null>(null);
  const [posting, setPosting] = React.useState(false);
  const toast = useToast();

  React.useEffect(() => {
    if (!thread || !open) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    apiJson<FaqThreadRow & { replies: FaqReplyRow[] }>(`/api/faq/threads/${thread.id}`)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [thread, open]);

  if (!thread) return null;

  async function submitReply() {
    if (!thread) return;
    setPosting(true);
    try {
      const created = await apiJson<FaqReplyRow>(`/api/faq/threads/${thread.id}/replies`, {
        method: "POST",
        body: JSON.stringify({ bodyMd: reply.trim() }),
      });
      setDetail((prev) => (prev ? { ...prev, replies: [...prev.replies, created], replyCount: prev.replyCount + 1 } : prev));
      setReply("");
      onReplyPosted?.();
      toast.push({ message: "Reply posted" });
    } catch (err) {
      toast.push({ message: err instanceof ApiError ? err.message : "Failed to post reply" });
    } finally {
      setPosting(false);
    }
  }

  const replies = detail?.replies ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={thread.title} className="max-w-lg">
        <div className="flex items-center gap-2">
          <Avatar name={displayNameFor(thread.authorId, identity?.userId)} size="sm" />
          <span className="text-[13px] text-muted font-body">
            {displayNameFor(thread.authorId, identity?.userId)} · {timeAgo(thread.createdAt)}
          </span>
          {thread.endorsed ? <StatusIndicator kind="done" label="Instructor endorsed" className="ml-2" /> : null}
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-body font-body">{detail?.bodyMd ?? thread.bodyMd}</p>

        <div className="mt-5 border-t border-hairline pt-4">
          <p className="text-[13px] font-medium font-body text-muted">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </p>
          {replies.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted font-body">No replies yet.</p>
          ) : (
            <div className="mt-2 space-y-3">
              {replies.map((r) => (
                <div key={r.id} className="flex items-start gap-2">
                  <Avatar name={displayNameFor(r.authorId, identity?.userId)} size="sm" />
                  <div className="min-w-0">
                    <p className="text-[12px] text-muted font-body">
                      {displayNameFor(r.authorId, identity?.userId)}
                      {r.isInstructor ? " · Instructor" : ""} · {timeAgo(r.createdAt)}
                    </p>
                    <p className="text-[13px] text-body font-body">{r.bodyMd}</p>
                  </div>
                </div>
              ))}
            </div>
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
            <Button variant="primary" size="sm" disabled={!reply.trim() || posting} onClick={submitReply}>
              {posting ? "Posting…" : "Reply"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
