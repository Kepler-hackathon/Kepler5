"use client";

import * as React from "react";
import { ThumbsUp, ThumbsDown } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { AiBadge } from "@/components/ui/badges";
import type { ToolInvocation } from "ai";
import { TraceStepperWidget } from "@/components/widgets/trace-stepper-widget";
import { ConceptSliderWidget } from "@/components/widgets/concept-slider-widget";
import { PredictCheckWidget } from "@/components/widgets/predict-check-widget";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant" | "divider";
  text?: string;
  toolInvocations?: ToolInvocation[];
}

// ---------------------------------------------------------------------------
// Markdown renderer — handles the patterns Claude actually emits
// ---------------------------------------------------------------------------

function renderInline(text: string): React.ReactNode[] {
  // Split on **bold**, *italic*, and `code`
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*)|(`([^`]+)`)|((?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) {
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(
        <code key={key++} className="rounded bg-surface-card px-1 py-0.5 font-code text-[13px]">
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      parts.push(<em key={key++}>{match[6]}</em>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MarkdownContent({ text }: { text: string }) {
  // Split on code fences first to protect them from inline processing
  const fenceRe = /```(\w*)\n?([\s\S]*?)```/g;
  const segments: Array<{ type: "code"; lang: string; content: string } | { type: "text"; content: string }> = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(text)) !== null) {
    if (match.index > last) segments.push({ type: "text", content: text.slice(last, match.index) });
    segments.push({ type: "code", lang: match[1] ?? "", content: match[2] ?? "" });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ type: "text", content: text.slice(last) });

  const nodes: React.ReactNode[] = [];
  let nodeKey = 0;

  for (const seg of segments) {
    if (seg.type === "code") {
      nodes.push(
        <pre key={nodeKey++} className="my-2 overflow-x-auto rounded-[var(--radius-control)] bg-surface-dark p-3">
          <code className="font-code text-[13px] text-on-dark whitespace-pre">{seg.content.trimEnd()}</code>
        </pre>
      );
      continue;
    }

    // Process text segment line by line
    const lines = seg.content.split("\n");
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Horizontal rule
      if (/^---+$/.test(line.trim())) {
        nodes.push(<hr key={nodeKey++} className="border-hairline my-2" />);
        i++;
        continue;
      }

      // H2
      const h2 = line.match(/^##\s+(.+)/);
      if (h2) {
        nodes.push(
          <p key={nodeKey++} className="text-[15px] font-semibold font-body text-ink mt-3 mb-1">
            {renderInline(h2[1])}
          </p>
        );
        i++;
        continue;
      }

      // H3
      const h3 = line.match(/^###\s+(.+)/);
      if (h3) {
        nodes.push(
          <p key={nodeKey++} className="text-[14px] font-semibold font-body text-ink mt-2 mb-0.5">
            {renderInline(h3[1])}
          </p>
        );
        i++;
        continue;
      }

      // Bullet list — collect consecutive bullet lines
      if (/^[-*]\s/.test(line)) {
        const items: React.ReactNode[] = [];
        while (i < lines.length && /^[-*]\s/.test(lines[i])) {
          const content = lines[i].replace(/^[-*]\s/, "");
          items.push(
            <li key={i} className="text-[14px] font-body">
              {renderInline(content)}
            </li>
          );
          i++;
        }
        nodes.push(
          <ul key={nodeKey++} className="list-disc pl-4 space-y-0.5 my-1">
            {items}
          </ul>
        );
        continue;
      }

      // Table — collect consecutive | lines
      if (line.trim().startsWith("|")) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          tableLines.push(lines[i]);
          i++;
        }
        // Filter out separator rows (---|---)
        const dataRows = tableLines.filter((l) => !/^\|[-| :]+\|$/.test(l.trim()));
        if (dataRows.length > 0) {
          const parseRow = (l: string) =>
            l
              .trim()
              .replace(/^\|/, "")
              .replace(/\|$/, "")
              .split("|")
              .map((c) => c.trim());
          const [headerRow, ...bodyRows] = dataRows;
          const headers = parseRow(headerRow);
          nodes.push(
            <table key={nodeKey++} className="my-2 w-full text-left text-[13px] font-body border-collapse">
              <thead>
                <tr>
                  {headers.map((h, ci) => (
                    <th key={ci} className="border border-hairline bg-surface-card px-3 py-1.5 font-semibold text-ink">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? "bg-canvas" : "bg-surface-soft"}>
                    {parseRow(row).map((cell, ci) => (
                      <td key={ci} className="border border-hairline px-3 py-1.5 text-body">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        continue;
      }

      // Blank line — paragraph break
      if (line.trim() === "") {
        i++;
        continue;
      }

      // Plain paragraph — collect non-blank, non-special lines
      const paraLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !/^(##|###|[-*]\s|---+|\|)/.test(lines[i])
      ) {
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length > 0) {
        nodes.push(
          <p key={nodeKey++} className="text-[14px] leading-relaxed font-body">
            {renderInline(paraLines.join(" "))}
          </p>
        );
      }
    }
  }

  return <div className="space-y-1">{nodes}</div>;
}

// ---------------------------------------------------------------------------
// Widget renderer — dispatches to the right widget based on type
// ---------------------------------------------------------------------------

type WidgetArgs = {
  type: "trace_stepper" | "concept_slider" | "predict_check";
  title: string;
  // trace_stepper
  code?: string[];
  steps?: Array<{ narration: string; highlightLine: number; callStack: string[]; variables: Record<string, string> }>;
  // concept_slider
  description?: string;
  variable?: string;
  unit?: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  series?: { label: string; color: string }[];
  seriesValues?: number[][];
  // predict_check
  scenario?: string;
  options?: { id: string; label: string }[];
  correctId?: string;
  explanation?: string;
};

function WidgetRenderer({ widget }: { widget: WidgetArgs }) {
  if (widget.type === "trace_stepper" && widget.code && widget.steps) {
    return (
      <div className="mt-2">
        <TraceStepperWidget code={widget.code} trace={widget.steps} title={widget.title} />
      </div>
    );
  }
  if (
    widget.type === "concept_slider" &&
    widget.description &&
    widget.variable &&
    widget.min !== undefined &&
    widget.max !== undefined &&
    widget.defaultValue !== undefined &&
    widget.series &&
    widget.seriesValues
  ) {
    return (
      <div className="mt-2">
        <ConceptSliderWidget
          title={widget.title}
          description={widget.description}
          variable={widget.variable}
          unit={widget.unit}
          min={widget.min}
          max={widget.max}
          defaultValue={widget.defaultValue}
          series={widget.series}
          seriesValues={widget.seriesValues}
        />
      </div>
    );
  }
  if (
    widget.type === "predict_check" &&
    widget.scenario &&
    widget.options &&
    widget.correctId &&
    widget.explanation
  ) {
    return (
      <div className="mt-2">
        <PredictCheckWidget
          title={widget.title}
          scenario={widget.scenario}
          options={widget.options}
          correctId={widget.correctId}
          explanation={widget.explanation}
        />
      </div>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// ChatMessageView
// ---------------------------------------------------------------------------

export function ChatMessageView({
  message,
  isStreaming,
}: {
  message: ChatMessageData;
  isStreaming?: boolean;
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

  const text = message.text ?? "";
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
          {isUser ? (
            <>
              {text}
              {isStreaming ? <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-current align-middle" aria-hidden /> : null}
            </>
          ) : (
            <>
              {text ? <MarkdownContent text={text} /> : null}
              {isStreaming ? <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-current align-middle" aria-hidden /> : null}
            </>
          )}
        </div>

        {/* Inline widgets from tool invocations */}
        {!isUser && message.toolInvocations?.map((inv) =>
          inv.toolName === "show_widget" && "args" in inv ? (
            <WidgetRenderer key={inv.toolCallId} widget={inv.args as WidgetArgs} />
          ) : null
        )}

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
