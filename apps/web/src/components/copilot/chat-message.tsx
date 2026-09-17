"use client";

import * as React from "react";
import { ThumbsUp, ThumbsDown } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { AiBadge, CitationChip, UngroundedNotice } from "@/components/ui/badges";
import { BinaryTreeDiagram } from "@/components/slide-viewer/binary-tree-diagram";
import { InlineQuizCard } from "./inline-quiz-card";
import { WidgetSlot } from "@/components/widgets/widget-slot";
import type { QuizQuestion } from "@/lib/data/types";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant" | "divider";
  text?: string;
  citation?: string;
  grounded?: boolean;
  showDiagram?: boolean;
  quiz?: QuizQuestion[];
  widget?: {
    typeBadge: string;
    title: string;
    explanation: string;
    state: "loading" | "error" | "ready";
  };
}

export function ChatMessageView({
  message,
  streamedText,
  isStreaming,
  widgetLoading,
}: {
  message: ChatMessageData;
  /** When set, overrides message.text with the in-progress streamed value. */
  streamedText?: string;
  isStreaming?: boolean;
  widgetLoading?: boolean;
}) {
  const [vote, setVote] = React.useState<"up" | "down" | null>(null);

  if (message.role === "divider") {
    return (
      <div className="flex items-center gap-3 py-2 text-[12px] text-muted font-body">
        <div className="h-px flex-1 bg-hairline" />
        {message.text}
        <div className="h-px flex-1 bg-hairline" />
      </div>
    );
  }

  const text = streamedText ?? message.text ?? "";
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] space-y-2", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-[var(--radius-card)] px-4 py-2.5 text-[14px] leading-relaxed font-body",
            isUser ? "bg-button-primary text-on-primary" : "bg-surface-card text-ink"
          )}
        >
          {text}
          {isStreaming ? <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-current align-middle" aria-hidden /> : null}
        </div>

        {!isUser && !isStreaming && message.showDiagram ? (
          <div className="w-full max-w-[220px] rounded-[var(--radius-card)] border border-hairline bg-canvas p-3">
            <BinaryTreeDiagram className="w-full" />
          </div>
        ) : null}

        {!isUser && !isStreaming && message.quiz ? (
          <div className="w-full space-y-3">
            {message.quiz.map((q) => (
              <InlineQuizCard key={q.id} question={q} />
            ))}
          </div>
        ) : null}

        {!isUser && message.widget ? (
          <div className="w-full">
            <WidgetSlot
              typeBadge={message.widget.typeBadge}
              title={message.widget.title}
              explanation={message.widget.explanation}
              loading={isStreaming || (widgetLoading ?? false)}
              error={message.widget.state === "error"}
              size="compact"
            />
          </div>
        ) : null}

        {!isUser && !isStreaming && message.grounded === false ? <UngroundedNotice /> : null}
        {!isUser && !isStreaming && message.citation ? <CitationChip>{message.citation}</CitationChip> : null}

        {!isUser && !isStreaming ? (
          <div className="flex items-center gap-3">
            <AiBadge />
            <span className="text-[12px] text-muted font-body">Helpful?</span>
            <button
              onClick={() => setVote(vote === "up" ? null : "up")}
              aria-label="Mark as helpful"
              className={cn(
                "rounded p-1 transition-colors hover:text-ink",
                vote === "up" ? "text-success" : "text-muted"
              )}
            >
              <ThumbsUp className="size-3.5" weight={vote === "up" ? "fill" : "regular"} />
            </button>
            <button
              onClick={() => setVote(vote === "down" ? null : "down")}
              aria-label="Mark as not helpful"
              className={cn(
                "rounded p-1 transition-colors hover:text-ink",
                vote === "down" ? "text-error" : "text-muted"
              )}
            >
              <ThumbsDown className="size-3.5" weight={vote === "down" ? "fill" : "regular"} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
