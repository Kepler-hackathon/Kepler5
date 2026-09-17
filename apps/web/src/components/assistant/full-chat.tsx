"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useChat, type Message } from "ai/react";
import { ArrowDown, PaperPlaneRight, Stop, Sparkle, Plus, List, X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { AppNav } from "@/components/nav/app-nav";
import { IconButton, Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { ChatMessageView } from "@/components/copilot/chat-message";
import { useIdentity } from "@/lib/identity";
import { apiJson } from "@/lib/api-client";

const STARTER_QUESTIONS = [
  "What's the difference between a stack and a queue?",
  "Explain the base case in a recursive function",
  "Summarize this course so far",
];

interface ChatThread {
  id: string;
  title: string | null;
  scope: string;
  scopeId: string | null;
  lastMessageAt: string | null;
}

function ConversationList({
  threads,
  activeId,
  onSelect,
  onSwitch,
}: {
  threads: ChatThread[];
  activeId: string | null;
  onSelect?: () => void;
  onSwitch: (id: string) => void;
}) {
  if (threads.length === 0) {
    return <p className="mt-3 text-[12px] text-muted font-body px-1">No saved conversations yet.</p>;
  }
  return (
    <div className="mt-3 space-y-0.5">
      {threads.map((t) => (
        <button
          key={t.id}
          onClick={() => { onSwitch(t.id); onSelect?.(); }}
          className={`w-full truncate rounded px-2 py-1.5 text-left text-[13px] font-body transition-colors ${
            t.id === activeId ? "bg-surface-card text-ink" : "text-muted hover:bg-surface-soft hover:text-ink"
          }`}
        >
          {t.title || "New conversation"}
        </button>
      ))}
    </div>
  );
}

interface ScopeModule { id: string; name: string }

/** The actual chat surface for one real thread — keyed by threadId in the parent so
 * switching threads remounts this with the right initialMessages (useChat's id is an
 * SWR-style cache key, initialMessages only applies on first mount for a given id). */
function ThreadChat({
  threadId,
  initialMessages,
  headers,
  onFinish,
  modules,
  scope,
  onScopeChange,
}: {
  threadId: string;
  initialMessages: Message[];
  headers: Record<string, string>;
  onFinish: () => void;
  modules: ScopeModule[];
  scope: string;
  onScopeChange: (scope: string, scopeId: string | null) => void;
}) {
  const { messages, input, setInput, handleSubmit, isLoading, stop, append } = useChat({
    id: threadId,
    api: `/api/chat/threads/${threadId}/messages`,
    initialMessages,
    headers,
    onFinish,
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-hairline px-6 py-2">
        <span className="text-[12px] font-medium font-body text-muted uppercase tracking-[0.5px]">Scope</span>
        <select
          value={scope}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "course") { onScopeChange("course", null); return; }
            const mod = modules.find((m) => m.id === val);
            if (mod) onScopeChange("module", mod.id);
          }}
          className="rounded-full border border-hairline bg-surface-card px-3 py-1 text-[12px] font-body text-ink focus:outline-none cursor-pointer"
        >
          <option value="course">Course-wide</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
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
              message={{ id: m.id, role: m.role === "user" ? "user" : "assistant", text: m.content, toolInvocations: m.toolInvocations }}
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

      {messages.length > 0 && !isLoading ? (
        <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-2 px-6 pb-2">
          {["Explain more simply", "Show me visually", "Step through Code Trace"].map((chip) => (
            <button
              key={chip}
              onClick={() => append({ role: "user", content: chip })}
              className="rounded-full border border-hairline bg-canvas px-3 py-1.5 text-[13px] font-body text-ink transition-colors hover:border-accent-text/50 hover:text-accent-text"
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-3xl border-t border-hairline px-6 py-4">
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 rounded-[var(--radius-control)] border border-hairline bg-canvas px-3 py-2 focus-within:border-accent-text/60"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={1}
            placeholder="Ask about the course…"
            className={cn("max-h-32 flex-1 resize-none border-0 p-0 focus:border-0")}
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
      </div>
    </div>
  );
}

export function FullChat({ courseId }: { courseId: string; continuedFrom?: { lecture: number; slide: number } }) {
  const router = useRouter();
  const identity = useIdentity();
  const [threads, setThreads] = React.useState<ChatThread[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [initialMessages, setInitialMessages] = React.useState<Message[]>([]);
  const [listDrawerOpen, setListDrawerOpen] = React.useState(false);
  const [citedLectureIds, setCitedLectureIds] = React.useState<string[]>([]);
  const [scopeModules, setScopeModules] = React.useState<ScopeModule[]>([]);
  // scopeSelectValue: "course" | moduleId — drives the <select> value in ThreadChat
  const [scopeSelectValue, setScopeSelectValue] = React.useState<string>("course");

  const headers = React.useMemo<Record<string, string>>(() => {
    const h: Record<string, string> = {};
    if (identity) {
      h["x-kepler-user"] = identity.userId;
      h["x-kepler-role"] = identity.role;
    }
    return h;
  }, [identity]);

  const loadThreads = React.useCallback(async () => {
    if (!identity) return [];
    const list = await apiJson<ChatThread[]>("/api/chat/threads");
    setThreads(list);
    return list;
  }, [identity]);

  const openThread = React.useCallback(async (id: string) => {
    if (!identity) return;
    const history = await apiJson<Array<{ id: string; role: string; content: string }>>(`/api/chat/threads/${id}/messages`);
    setInitialMessages(history.map((m) => ({ id: m.id, role: m.role as Message["role"], content: m.content })));
    setActiveId(id);
    const cited = await apiJson<{ lectureIds: string[] }>(`/api/chat/threads/${id}/cited-lectures`).catch(() => ({ lectureIds: [] }));
    setCitedLectureIds(cited.lectureIds);
    const threadMeta = await apiJson<ChatThread>(`/api/chat/threads/${id}`).catch(() => null);
    if (threadMeta) {
      setScopeSelectValue(threadMeta.scope === "module" && threadMeta.scopeId ? threadMeta.scopeId : "course");
    }
  }, [identity]);

  const startNewChat = React.useCallback(async (scope?: string, scopeId?: string | null) => {
    if (!identity) return;
    const resolvedScope = scope ?? "course";
    const resolvedScopeId = resolvedScope === "course" ? (courseId || null) : (scopeId ?? null);
    const thread = await apiJson<ChatThread>("/api/chat/threads", {
      method: "POST",
      body: JSON.stringify({ scope: resolvedScope, scopeId: resolvedScopeId }),
    });
    setThreads((prev) => [thread, ...prev]);
    setInitialMessages([]);
    setActiveId(thread.id);
    setCitedLectureIds([]);
    setScopeSelectValue(resolvedScope === "module" && resolvedScopeId ? resolvedScopeId : "course");
    setListDrawerOpen(false);
  }, [identity, courseId]);

  React.useEffect(() => {
    if (!identity) return;
    (async () => {
      apiJson<{ modules: ScopeModule[] }>(`/api/course?courseId=${courseId}`)
        .then((d) => setScopeModules(d.modules.map((m) => ({ id: m.id, name: m.name }))))
        .catch(() => {});
      const list = await loadThreads();
      if (list.length > 0) {
        await openThread(list[0]!.id);
      } else {
        await startNewChat();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  function generateQuiz() {
    const query = citedLectureIds.length > 0 ? `?lectures=${citedLectureIds.join(",")}` : "";
    router.push(`/quizzes${query}`);
  }

  if (!identity || !activeId) {
    return (
      <div className="flex h-screen flex-col bg-canvas">
        <AppNav courseId={courseId} course={null} activeHref="/assistant" />
        <div className="flex flex-1 items-center justify-center text-[14px] text-muted font-body">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-canvas">
      <AppNav courseId={courseId} course={null} activeHref="/assistant" />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-hairline p-4 lg:block">
          <Button variant="secondary" size="sm" className="w-full justify-start gap-2" onClick={() => startNewChat()}>
            <Plus className="size-4" /> New chat
          </Button>
          <ConversationList threads={threads} activeId={activeId} onSwitch={openThread} />
        </aside>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5 lg:hidden">
            <button
              onClick={() => setListDrawerOpen(true)}
              className="flex items-center gap-1.5 text-[13px] font-medium font-body text-muted hover:text-ink"
              aria-label="Open conversation list"
            >
              <List className="size-4" /> Conversations
            </button>
          </div>

          <ThreadChat
            key={activeId}
            threadId={activeId}
            initialMessages={initialMessages}
            headers={headers}
            onFinish={() => {
              loadThreads();
              apiJson<{ lectureIds: string[] }>(`/api/chat/threads/${activeId}/cited-lectures`)
                .then((c) => setCitedLectureIds(c.lectureIds))
                .catch(() => {});
            }}
            modules={scopeModules}
            scope={scopeSelectValue}
            onScopeChange={(s, sid) => startNewChat(s, sid)}
          />

          <div className="mx-auto w-full max-w-3xl px-6 pb-2">
            <button
              onClick={generateQuiz}
              className="text-[13px] font-medium font-body text-accent-text hover:underline underline-offset-2"
            >
              Generate practice quiz on this &rarr;
            </button>
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
            <Button variant="secondary" size="sm" className="w-full justify-start gap-2" onClick={() => startNewChat()}>
              <Plus className="size-4" /> New chat
            </Button>
            <ConversationList threads={threads} activeId={activeId} onSwitch={openThread} onSelect={() => setListDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
