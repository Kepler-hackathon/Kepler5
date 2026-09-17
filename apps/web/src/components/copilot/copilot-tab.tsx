"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, PaperPlaneRight, Stop, Sparkle } from "@phosphor-icons/react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { IconButton } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { ChatMessageView, type ChatMessageData } from "./chat-message";
import { answerFor } from "@/lib/ai/copilot-responses";
import { useStreamingText } from "@/lib/ai/simulate-stream";
import { MINI_QUIZ } from "@/lib/data/mini-quiz";

const STARTER_CHIPS = ["Generate Mini-Quiz", "Step through Code Trace", "Explain more simply", "Show me visually"];
const CHAR_LIMIT = 4000;

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `msg-${idCounter}`;
}

export function CopilotTab({ slideNumber, lectureNumber }: { slideNumber: number; lectureNumber: number }) {
  const [scope, setScope] = React.useState<"slide" | "lecture">("slide");
  const [messages, setMessages] = React.useState<ChatMessageData[]>([]);
  const [streamingMessage, setStreamingMessage] = React.useState<ChatMessageData | null>(null);
  const [draft, setDraft] = React.useState("");
  const [atBottom, setAtBottom] = React.useState(true);
  const listRef = React.useRef<HTMLDivElement>(null);
  const lastSlideRef = React.useRef(slideNumber);

  const streaming = useStreamingText(streamingMessage?.text ?? "", { active: streamingMessage !== null });

  React.useEffect(() => {
    if (lastSlideRef.current !== slideNumber && messages.length + (streamingMessage ? 1 : 0) > 0) {
      setMessages((m) => [...m, { id: nextId(), role: "divider", text: `Now on Slide ${slideNumber}` }]);
    }
    lastSlideRef.current = slideNumber;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideNumber]);

  // Commit the streamed message once it finishes, adjusting state during render (keyed
  // to the message id, not just status, so a later message can't be skipped because an
  // earlier one already left "done" behind) rather than in an effect.
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

  function pushUser(text: string) {
    setMessages((m) => [...m, { id: nextId(), role: "user", text }]);
    setAtBottom(true);
  }

  function sendFreeform() {
    const text = draft.trim();
    if (!text || streamingMessage) return;
    pushUser(text);
    const answer = answerFor(text);
    setStreamingMessage({ id: nextId(), role: "assistant", text: answer.text, citation: answer.citation, grounded: answer.grounded });
    setDraft("");
  }

  function sendChip(chip: string) {
    if (streamingMessage) return;
    pushUser(chip);
    if (chip === "Generate Mini-Quiz") {
      setStreamingMessage({
        id: nextId(),
        role: "assistant",
        text: "Here are two quick checks on today's material:",
        quiz: MINI_QUIZ,
      });
      return;
    }
    const answer = answerFor(chip);
    setStreamingMessage({
      id: nextId(),
      role: "assistant",
      text: answer.text,
      citation: answer.citation,
      grounded: answer.grounded,
      showDiagram: chip === "Show me visually",
    });
  }

  const isEmpty = messages.length === 0 && !streamingMessage;

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
            <p className="text-[14px] text-muted font-body">
              Ask about this slide, or try one of these.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => sendChip(chip)}
                  className="rounded-full border border-hairline bg-canvas px-3 py-1.5 text-[13px] font-body text-ink transition-colors hover:border-accent-text/50 hover:text-accent-text"
                >
                  {chip}
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

      {!isEmpty ? (
        <div className="flex flex-wrap gap-2 border-t border-hairline px-4 py-2">
          {STARTER_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => sendChip(chip)}
              disabled={!!streamingMessage}
              className="rounded-full border border-hairline px-2.5 py-1 text-[12px] font-body text-muted transition-colors hover:border-accent-text/50 hover:text-accent-text disabled:opacity-40"
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      <div className="border-t border-hairline p-3">
        <div className="flex items-end gap-2 rounded-[var(--radius-control)] border border-hairline bg-canvas px-3 py-2 focus-within:border-accent-text/60">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, CHAR_LIMIT))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendFreeform();
              }
            }}
            rows={1}
            placeholder="Ask about Slide 14…"
            className="max-h-32 flex-1 resize-none border-0 p-0 focus:border-0"
          />
          {streamingMessage ? (
            <IconButton label="Stop" onClick={() => streaming.stop()}>
              <Stop weight="fill" />
            </IconButton>
          ) : (
            <IconButton
              label="Send"
              disabled={!draft.trim()}
              onClick={sendFreeform}
              className="text-button-primary disabled:text-muted"
            >
              <PaperPlaneRight />
            </IconButton>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between px-1">
          <p className="text-[12px] text-muted font-body">
            {streamingMessage ? "Waiting for the response to finish loading…" : "Enter to send · Shift+Enter for a new line"}
          </p>
          {draft.length > CHAR_LIMIT - 200 ? (
            <p className="text-[12px] text-muted font-body">{draft.length}/{CHAR_LIMIT}</p>
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
