"use client";

import * as React from "react";
import { ThumbsUp, ThumbsDown } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { SparkGlyph } from "@/components/ui/status-icons";

export interface MemoryVariable {
  name: string;
  type: string;
  value: string;
  pointsTo?: string;
}

export interface StackFrame {
  label: string;
  variables: MemoryVariable[];
}

export interface HeapObject {
  name: string;
  type: string;
  value: string;
}

interface Props {
  title: string;
  description?: string;
  frames: StackFrame[];
  heapObjects?: HeapObject[];
}

function VarRow({ variable, isRef }: { variable: MemoryVariable; isRef: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-0 rounded border font-code text-[12px]",
      isRef ? "border-[#cc785c]/60 bg-[#cc785c]/10" : "border-white/15 bg-white/5"
    )}>
      <span className="border-r border-white/10 px-2 py-1.5 text-on-dark-soft min-w-[4.5rem] truncate">{variable.name}</span>
      <span className="border-r border-white/10 px-2 py-1.5 text-[#94d8fc]/80 min-w-[3.5rem] truncate">{variable.type}</span>
      <span className={cn("px-2 py-1.5 flex-1 truncate", isRef ? "text-[#cc785c]" : "text-on-dark")}>
        {variable.value}
        {isRef && <span className="ml-1 text-[10px] text-on-dark-soft">→</span>}
      </span>
    </div>
  );
}

export function MemoryDiagramWidget({ title, description, frames, heapObjects }: Props) {
  const [feedback, setFeedback] = React.useState<"up" | "down" | null>(null);
  const hasHeap = heapObjects && heapObjects.length > 0;

  return (
    <div className="rounded-[var(--radius-card)] bg-surface-dark p-6 text-on-dark">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium font-body uppercase tracking-[1px] text-on-dark-soft">
          Memory · {title}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-button-primary px-3 py-1 text-[11px] font-semibold font-body uppercase tracking-[1.5px] text-on-primary">
          <SparkGlyph />
          AI generated
        </div>
      </div>

      {description && (
        <p className="mt-3 text-[14px] leading-relaxed text-on-dark-soft font-body">{description}</p>
      )}

      <div className={cn("mt-4 grid gap-4", hasHeap ? "grid-cols-2" : "grid-cols-1")}>
        {/* Stack */}
        <div>
          <p className="mb-2 text-[11px] font-medium font-body uppercase tracking-[1px] text-on-dark-soft">
            Stack
          </p>
          <div className="space-y-3">
            {frames.map((frame, fi) => (
              <div key={fi} className="rounded border border-white/10 overflow-hidden">
                <div className="border-b border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium font-body text-on-dark-soft uppercase tracking-[0.5px]">
                  {frame.label}
                </div>
                <div className="space-y-px p-1">
                  {frame.variables.map((v, vi) => (
                    <VarRow key={vi} variable={v} isRef={!!v.pointsTo} />
                  ))}
                  {frame.variables.length === 0 && (
                    <p className="px-2 py-1.5 text-[12px] text-on-dark-soft/50 font-code italic">empty</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Heap */}
        {hasHeap && (
          <div>
            <p className="mb-2 text-[11px] font-medium font-body uppercase tracking-[1px] text-on-dark-soft">
              Heap
            </p>
            <div className="space-y-2">
              {heapObjects!.map((obj, i) => (
                <div key={i} className="rounded border border-[#cc785c]/40 bg-[#cc785c]/8 overflow-hidden">
                  <div className="border-b border-[#cc785c]/20 bg-[#cc785c]/10 px-2 py-1">
                    <span className="font-code text-[11px] text-[#cc785c]">{obj.name}</span>
                    <span className="ml-1.5 font-code text-[11px] text-on-dark-soft">: {obj.type}</span>
                  </div>
                  <div className="p-2 font-code text-[12px] text-on-dark whitespace-pre-wrap break-all">
                    {obj.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm bg-[#cc785c]/30 border border-[#cc785c]/60" />
              <span className="text-[11px] text-on-dark-soft font-body">reference type</span>
            </div>
          </div>
        )}
      </div>

      {/* Column header legend */}
      <div className="mt-2 flex gap-0 font-code text-[10px] text-on-dark-soft/50">
        <span className="min-w-[4.5rem] mr-2">name</span>
        <span className="min-w-[3.5rem] mr-2">type</span>
        <span>value</span>
      </div>

      {/* Helpful */}
      <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
        <span className="text-[13px] text-on-dark-soft font-body">Helpful?</span>
        {(["up", "down"] as const).map(d => (
          <button key={d} type="button"
            onClick={() => setFeedback(feedback === d ? null : d)}
            className={cn("rounded-full p-1.5 transition-colors",
              feedback === d
                ? d === "up" ? "bg-success/20 text-success" : "bg-error/20 text-error"
                : "text-on-dark-soft hover:bg-white/10"
            )}>
            {d === "up" ? <ThumbsUp className="size-4" /> : <ThumbsDown className="size-4" />}
          </button>
        ))}
      </div>
    </div>
  );
}
