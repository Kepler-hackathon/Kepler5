"use client";

import * as React from "react";
import Link from "next/link";
import { useChat, type Message } from "ai/react";
import { ArrowDown, PaperPlaneRight, Stop, Sparkle } from "@phosphor-icons/react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { IconButton } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { ChatMessageView } from "./chat-message";
import { useIdentity } from "@/lib/identity";
import { apiJson } from "@/lib/api-client";

const STARTER_QUESTIONS = ["Explain this more simply", "What should I remember from this?", "Give me an example"];
const CHAR_LIMIT = 4000;

/**
 * Real per-slide/lecture AI copilot. `lectureId`/`slideId` are the real Postgres UUIDs for
 * the current lecture/slide (passed down from the slide viewer, which owns real content
 * browsing — see plan stage 4); `slideNumber`/`lectureNumber` are display-only.
 */
export function CopilotTab({
  slideNumber,
  lectureNumber,
  lectureId,
  slideId,
}: {
  slideNumber: number;
  lectureNumber: number;
  lectureId?: string;
  slideId?: string;
}) {
  const identity = useIdentity();
  const [scope, setScope] = React.useState<"slide" | "lecture">("slide");
  const [threadId, setThreadId] = React.useState<string | null>(null);

  const scopeId = scope === "slide" ? (slideId ?? null) : (lectureId ?? null);

  // A fresh thread per (scope, scopeId) — matches the mock's "Now on Slide N" reset
  // behavior, but as a real distinct chat_threads row instead of an in-memory divider.
  React.useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    apiJson<{ id: string }>("/api/chat/threads", {
      method: "POST",
      body: JSON.stringify({ scope, scopeId }),
    }).then((thread) => {
      if (!cancelled) setThreadId(thread.id);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, scope, scopeId]);

  if (!identity || !threadId) {
    return <div className="flex h-full items-center justify-center text-[13px] text-muted font-body">Loading…</div>;
  }

  return (
    <CopilotThread
      key={threadId}
      threadId={threadId}
      headers={{ "x-kepler-user": identity.userId, "x-kepler-role": identity.role }}
      scope={scope}
      setScope={setScope}
      slideNumber={slideNumber}
      lectureNumber={lectureNumber}
    />
  );
}

function CopilotThread({
  threadId,
  headers,
  scope,
  setScope,
  slideNumber,
  lectureNumber,
}: {
  threadId: string;
  headers: Record<string, string>;
  scope: "slide" | "lecture";
  setScope: (s: "slide" | "lecture") => void;
  slideNumber: number;
  lectureNumber: number;
}) {
  const { messages, input, setInput, handleSubmit, isLoading, stop, append } = useChat({
    id: threadId,
    api: `/api/chat/threads/${threadId}/messages`,
    headers,
  });

  const [atBottom, setAtBottom] = React.useState(true);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (atBottom) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, atBottom]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  }

  const isEmpty = messages.length === 0;
  const asMessageData = (m: Message): { id: string; role: "user" | "assistant"; text: string } => ({
    id: m.id,
    role: m.role === "user" ? "user" : "assistant",
    text: m.content,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <SegmentedControl
          label="Answer scope"
          value={scope}
          onChange={setScope}
          options={[
            { value: "slide", label: "This Slide" },
            { value: "lecture", label: "Whole Lecture" },
          ]}
        />
      </div>

      <div ref={listRef} onScroll={onScroll} className="relative flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-2 text-center">
            <Sparkle className="size-6 text-accent-text" aria-hidden />
            <p className="text-[14px] text-muted font-body">Ask about this slide, or try one of these.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => append({ role: "user", content: q })}
                  className="rounded-full border border-hairline bg-canvas px-3 py-1.5 text-[13px] font-body text-ink transition-colors hover:border-accent-text/50 hover:text-accent-text"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <ChatMessageView
              key={m.id}
              message={asMessageData(m)}
              isStreaming={isLoading && m.id === messages[messages.length - 1]?.id && m.role === "assistant"}
            />
          ))
        )}
      </div>

      {!atBottom ? (
        <button
          onClick={() => {
            setAtBottom(true);
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
          }}
          className="mx-auto mb-2 flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-3 py-1 text-[12px] font-body text-ink shadow-sm"
        >
          New reply <ArrowDown className="size-3" />
        </button>
      ) : null}

      <div className="border-t border-hairline p-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-[var(--radius-control)] border border-hairline bg-canvas px-3 py-2 focus-within:border-accent-text/60">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, CHAR_LIMIT))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={1}
            placeholder={scope === "slide" ? `Ask about Slide ${slideNumber}…` : `Ask about Lecture ${lectureNumber}…`}
            className="max-h-32 flex-1 resize-none border-0 p-0 focus:border-0"
          />
          {isLoading ? (
            <IconButton label="Stop" onClick={stop}>
              <Stop weight="fill" />
            </IconButton>
          ) : (
            <IconButton type="submit" label="Send" disabled={!input.trim()} className="text-button-primary disabled:text-muted">
              <PaperPlaneRight />
            </IconButton>
          )}
        </form>
        <div className="mt-1 flex items-center justify-between px-1">
          <p className="text-[12px] text-muted font-body">
            {isLoading ? "Waiting for the response to finish loading…" : `Scope: ${scope === "slide" ? `Slide ${slideNumber}` : `Lecture ${lectureNumber}`} · Enter to send`}
          </p>
          {input.length > CHAR_LIMIT - 200 ? (
            <p className="text-[12px] text-muted font-body">{input.length}/{CHAR_LIMIT}</p>
          ) : null}
        </div>
        <Link
          href={`/assistant?lecture=${lectureNumber}&slide=${slideNumber}`}
          className="mt-2 inline-block text-[13px] font-medium font-body text-accent-text hover:underline underline-offset-2"
        >
          Open in full chat →
        </Link>
      </div>
    </div>
  );
}
