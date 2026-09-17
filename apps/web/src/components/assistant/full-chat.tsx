"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, PaperPlaneRight, Stop, Sparkle, Plus, List, X } from "@phosphor-icons/react";
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

const STORAGE_KEY = "keplerlearn:chat:conversations";

type SavedConversation = {
  id: string;
  title: string;
  messages: ChatMessageData[];
  citedLectures: number[];
};

function ConversationList({
  conversations,
  activeConvId,
  onSelect,
  onSwitch,
}: {
  conversations: SavedConversation[];
  activeConvId: string;
  onSelect?: () => void;
  onSwitch: (conv: SavedConversation) => void;
}) {
  if (conversations.length === 0) {
    return <p className="mt-3 text-[12px] text-muted font-body px-1">No saved conversations yet.</p>;
  }
  return (
    <div className="mt-3 space-y-0.5">
      {conversations.map((c) => (
        <button
          key={c.id}
          onClick={() => { onSwitch(c); onSelect?.(); }}
          className={`w-full truncate rounded px-2 py-1.5 text-left text-[13px] font-body transition-colors ${
            c.id === activeConvId ? "bg-surface-card text-ink" : "text-muted hover:bg-surface-soft hover:text-ink"
          }`}
        >
          {c.title || "New conversation"}
        </button>
      ))}
    </div>
  );
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
  const [listDrawerOpen, setListDrawerOpen] = React.useState(false);
  const [conversations, setConversations] = React.useState<SavedConversation[]>([]);
  const [activeConvId, setActiveConvId] = React.useState<string>(() => `conv-${Date.now()}`);
  const [widgetPendingId, setWidgetPendingId] = React.useState<string | null>(null);
  const widgetTimerRef = React.useRef<number | null>(null);
  const prevStreamingRef = React.useRef<ChatMessageData | null>(null);
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

  // Load saved conversations on mount
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: SavedConversation[] = JSON.parse(raw);
        if (saved.length > 0) {
          setConversations(saved);
          const last = saved[saved.length - 1];
          setActiveConvId(last.id);
          setMessages(last.messages);
          setCitedLectures(last.citedLectures);
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist current conversation whenever messages change
  React.useEffect(() => {
    if (messages.length === 0) return;
    const title = messages.find((m) => m.role === "user")?.text?.slice(0, 40) ?? "New conversation";
    setConversations((prev) => {
      const existing = prev.findIndex((c) => c.id === activeConvId);
      const updated: SavedConversation = { id: activeConvId, title, messages, citedLectures };
      const next =
        existing >= 0
          ? prev.map((c) => (c.id === activeConvId ? updated : c))
          : [...prev, updated];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Detect when a streaming message with a widget finishes and starts the resolution delay
  React.useEffect(() => {
    const prev = prevStreamingRef.current;
    prevStreamingRef.current = streamingMessage;
    if (prev?.widget && !streamingMessage) {
      if (widgetTimerRef.current) clearTimeout(widgetTimerRef.current);
      setWidgetPendingId(prev.id);
      widgetTimerRef.current = window.setTimeout(() => setWidgetPendingId(null), 1400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamingMessage]);

  React.useEffect(() => {
    if (atBottom) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, streaming.displayed, atBottom]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  }

  function startNewChat() {
    setMessages([]);
    setStreamingMessage(null);
    setCitedLectures([]);
    setActiveConvId(`conv-${Date.now()}`);
    setListDrawerOpen(false);
  }

  function switchConversation(conv: SavedConversation) {
    setMessages(conv.messages);
    setCitedLectures(conv.citedLectures);
    setActiveConvId(conv.id);
    setStreamingMessage(null);
  }

  function send(text: string) {
    if (!text.trim() || streamingMessage || widgetPendingId) return;
    setMessages((m) => [...m, { id: nextId(), role: "user", text: text.trim() }]);
    setAtBottom(true);
    if (/mini-quiz/i.test(text)) {
      setStreamingMessage({ id: nextId(), role: "assistant", text: "Here are two quick checks:", quiz: MINI_QUIZ });
      setCitedLectures((prev) => (prev.includes(8) ? prev : [...prev, 8]));
      setDraft("");
      return;
    }
    if (/visual|diagram|show me|picture/i.test(text)) {
      const widgetAnswer = answerFor(text);
      if (widgetAnswer.grounded) setCitedLectures((prev) => (prev.includes(8) ? prev : [...prev, 8]));
      setStreamingMessage({
        id: nextId(),
        role: "assistant",
        text: widgetAnswer.text,
        citation: widgetAnswer.citation,
        grounded: widgetAnswer.grounded,
        widget: {
          typeBadge: "trace-stepper",
          title: "Tree Height — Call Stack Walkthrough",
          explanation: "Interactive step-through of treeHeight(root) showing each recursive call, its return value, and how the call stack unwinds from the deepest leaf back to the root.",
          state: "loading",
        },
      });
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
            onClick={startNewChat}
          >
            <Plus className="size-4" /> New chat
          </Button>
          <ConversationList conversations={conversations} activeConvId={activeConvId} onSwitch={switchConversation} />
        </aside>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-hairline px-4 py-2.5 lg:hidden">
            <button
              onClick={() => setListDrawerOpen(true)}
              className="flex items-center gap-1.5 text-[13px] font-medium font-body text-muted hover:text-ink"
              aria-label="Open conversation list"
            >
              <List className="size-4" /> Conversations
            </button>
          </div>
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
                  <ChatMessageView key={m.id} message={m} widgetLoading={m.id === widgetPendingId} />
                ))}
                {streamingMessage ? (
                  <ChatMessageView message={streamingMessage} streamedText={streaming.displayed} isStreaming={streaming.status === "streaming"} widgetLoading={false} />
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
                <IconButton label="Send" disabled={!draft.trim() || !!widgetPendingId} onClick={() => send(draft)} className="text-button-primary disabled:text-muted">
                  <PaperPlaneRight />
                </IconButton>
              )}
            </div>
          </div>
        </div>
      </div>

      {listDrawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/20" onClick={() => setListDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-hairline bg-canvas p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-medium font-body text-ink">Conversations</span>
              <button onClick={() => setListDrawerOpen(false)} className="text-muted hover:text-ink">
                <X className="size-4" />
              </button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={startNewChat}
            >
              <Plus className="size-4" /> New chat
            </Button>
            <ConversationList conversations={conversations} activeConvId={activeConvId} onSwitch={switchConversation} onSelect={() => setListDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
