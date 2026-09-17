"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, PaperPlaneRight, Stop, Sparkle, Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { AppNav } from "@/components/nav/app-nav";
import { IconButton, Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { ChatMessageView, type ChatMessageData } from "@/components/copilot/chat-message";
import { answerFor } from "@/lib/ai/copilot-responses";
import { useStreamingText } from "@/lib/ai/simulate-stream";
import { MINI_QUIZ } from "@/lib/data/mini-quiz";

const STARTER_QUESTIONS = [
  "What's the difference between a stack and a queue?",
  "Explain the base case in treeHeight",
  "Generate a mini-quiz on this course",
];

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `full-msg-${idCounter}`;
}

/**
 * Screen 11 — full-page AI Course Assistant (frontend plan Part III, S11). Same message
 * design as the S4 Copilot, at full width, with a scope of "whole course" by default and
 * a lightweight conversation-list rail (no rename/delete in MVP, per spec).
 */
export function FullChat({ courseId, continuedFrom }: { courseId: string; continuedFrom?: { lecture: number; slide: number } }) {
  const router = useRouter();
  const [messages, setMessages] = React.useState<ChatMessageData[]>(() =>
    continuedFrom
      ? [{ id: nextId(), role: "divider", text: `Continued from Lecture ${continuedFrom.lecture} · Slide ${continuedFrom.slide}` }]
      : []
  );
  const [streamingMessage, setStreamingMessage] = React.useState<ChatMessageData | null>(null);
  const [draft, setDraft] = React.useState("");
  const [atBottom, setAtBottom] = React.useState(true);
  const [citedLectures, setCitedLectures] = React.useState<number[]>(continuedFrom ? [continuedFrom.lecture] : []);
  const listRef = React.useRef<HTMLDivElement>(null);

  const streaming = useStreamingText(streamingMessage?.text ?? "", { active: streamingMessage !== null });

  const [lastHandledStreamId, setLastHandledStreamId] = React.useState<string | null>(null);
  if (
    streamingMessage &&
    (streaming.status === "done" || streaming.status === "stopped") &&
    lastHandledStreamId !== streamingMessage.id
  ) {
    setLastHandledStreamId(streamingMessage.id);
    const finalText = streaming.status === "stopped" ? `${streaming.displayed} (stopped)` : streamingMessage.text;
    setMessages((m) => [...m, { ...streamingMessage, text: finalText }]);
    setStreamingMessage(null);
  }

  React.useEffect(() => {
    if (atBottom) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, streaming.displayed, atBottom]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  }

  function send(text: string) {
    if (!text.trim() || streamingMessage) return;
    setMessages((m) => [...m, { id: nextId(), role: "user", text: text.trim() }]);
    setAtBottom(true);
    if (/mini-quiz/i.test(text)) {
      setStreamingMessage({ id: nextId(), role: "assistant", text: "Here are two quick checks:", quiz: MINI_QUIZ });
      setCitedLectures((prev) => (prev.includes(8) ? prev : [...prev, 8]));
      setDraft("");
      return;
    }
    const answer = answerFor(text);
    if (answer.grounded) setCitedLectures((prev) => (prev.includes(8) ? prev : [...prev, 8]));
    setStreamingMessage({ id: nextId(), role: "assistant", text: answer.text, citation: answer.citation, grounded: answer.grounded });
    setDraft("");
  }

  const isEmpty = messages.length === 0 && !streamingMessage;
  const title = messages.find((m) => m.role === "user")?.text?.slice(0, 40) ?? "New conversation";

  function generateQuiz() {
    const query = citedLectures.length > 0 ? `?lectures=${citedLectures.join(",")}` : "";
    router.push(`/quizzes${query}`);
  }

  return (
    <div className="flex h-screen flex-col bg-canvas">
      <AppNav courseId={courseId} activeHref="/assistant" />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-hairline p-4 lg:block">
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => {
              setMessages([]);
              setStreamingMessage(null);
              setCitedLectures([]);
            }}
          >
            <Plus className="size-4" /> New chat
          </Button>
          <div className="mt-4 rounded-[var(--radius-control)] bg-surface-card px-3 py-2 text-[13px] font-body text-ink">
            {title}
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col">
          <div ref={listRef} onScroll={onScroll} className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
            {isEmpty ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <Sparkle className="size-7 text-accent-text" />
                <h2 className="text-[24px]">Ask about anything in this course</h2>
                <p className="text-[14px] text-muted font-body">Scope: whole course</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {STARTER_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="rounded-full border border-hairline bg-canvas px-3 py-1.5 text-[13px] font-body text-ink transition-colors hover:border-accent-text/50 hover:text-accent-text"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <ChatMessageView key={m.id} message={m} />
                ))}
                {streamingMessage ? (
                  <ChatMessageView message={streamingMessage} streamedText={streaming.displayed} isStreaming={streaming.status === "streaming"} />
                ) : null}
              </>
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

          <div className="mx-auto w-full max-w-3xl border-t border-hairline px-6 py-4">
            {!isEmpty ? (
              <button
                onClick={generateQuiz}
                className="mb-3 text-[13px] font-medium font-body text-accent-text hover:underline underline-offset-2"
              >
                Generate practice quiz on this &rarr;
              </button>
            ) : null}
            <div className="flex items-end gap-2 rounded-[var(--radius-control)] border border-hairline bg-canvas px-3 py-2 focus-within:border-accent-text/60">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(draft);
                  }
                }}
                rows={1}
                placeholder="Ask about the course…"
                className={cn("max-h-32 flex-1 resize-none border-0 p-0 focus:border-0")}
              />
              {streamingMessage ? (
                <IconButton label="Stop" onClick={() => streaming.stop()}>
                  <Stop weight="fill" />
                </IconButton>
              ) : (
                <IconButton label="Send" disabled={!draft.trim()} onClick={() => send(draft)} className="text-button-primary disabled:text-muted">
                  <PaperPlaneRight />
                </IconButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
