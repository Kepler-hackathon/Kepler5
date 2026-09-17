import { cn } from "@/lib/cn";
import { CitationChip, UngroundedNotice } from "@/components/ui/badges";
import { BinaryTreeDiagram } from "@/components/slide-viewer/binary-tree-diagram";
import { InlineQuizCard } from "./inline-quiz-card";
import type { QuizQuestion } from "@/lib/data/types";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant" | "divider";
  text?: string;
  citation?: string;
  grounded?: boolean;
  showDiagram?: boolean;
  quiz?: QuizQuestion[];
}

export function ChatMessageView({
  message,
  streamedText,
  isStreaming,
}: {
  message: ChatMessageData;
  /** When set, overrides message.text with the in-progress streamed value. */
  streamedText?: string;
  isStreaming?: boolean;
}) {
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

        {!isUser && !isStreaming && message.grounded === false ? <UngroundedNotice /> : null}
        {!isUser && !isStreaming && message.citation ? <CitationChip>{message.citation}</CitationChip> : null}
      </div>
    </div>
  );
}
