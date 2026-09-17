"use client";

import * as React from "react";
import { ThumbsUp, ThumbsDown } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { SparkGlyph } from "@/components/ui/status-icons";

interface ConceptSliderProps {
  title: string;
  description: string;
  variable: string;
  unit?: string;
  min: number;
  max: number;
  defaultValue: number;
  series: { label: string; color: string }[];
  /** seriesValues[seriesIndex][tickIndex] where tickIndex = value - min */
  seriesValues: number[][];
}

export function ConceptSliderWidget({
  title,
  description,
  variable,
  unit,
  min,
  max,
  defaultValue,
  series,
  seriesValues,
}: ConceptSliderProps) {
  const [value, setValue] = React.useState(defaultValue);
  const [feedback, setFeedback] = React.useState<"up" | "down" | null>(null);

  const tick = Math.max(0, Math.min(value - min, (seriesValues[0]?.length ?? 1) - 1));

  const currentValues = series.map((_, i) => seriesValues[i]?.[tick] ?? 0);
  const maxVal = Math.max(...currentValues, 1);

  return (
    <div className="rounded-[var(--radius-card)] bg-surface-dark p-6 text-on-dark">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium font-body uppercase tracking-[1px] text-on-dark-soft">
          Slider · {title}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-button-primary px-3 py-1 text-[11px] font-semibold font-body uppercase tracking-[1.5px] text-on-primary">
          <SparkGlyph />
          AI generated
        </div>
      </div>

      <p className="mt-3 max-w-prose text-[14px] leading-relaxed text-on-dark-soft font-body">
        {description}
      </p>

      {/* Slider */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-code text-[13px] text-on-dark">
            {variable} = {value}{unit ? ` ${unit}` : ""}
          </span>
          <span className="text-[12px] text-on-dark-soft font-body">{min} – {max}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full cursor-pointer"
          style={{ accentColor: "var(--color-button-primary)" }}
        />
      </div>

      {/* Bar chart */}
      <div className="mt-5 space-y-3">
        {series.map((s, i) => {
          const val = currentValues[i] ?? 0;
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          return (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between text-[12px] font-body">
                <span className="text-on-dark-soft">{s.label}</span>
                <span className="font-code text-on-dark">{val.toLocaleString()}</span>
              </div>
              <div className="h-5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{ width: `${pct}%`, backgroundColor: s.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Helpful? */}
      <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
        <span className="text-[13px] text-on-dark-soft font-body">Helpful?</span>
        <button
          type="button"
          aria-pressed={feedback === "up"}
          onClick={() => setFeedback(feedback === "up" ? null : "up")}
          className={cn(
            "rounded-full p-1.5 transition-colors",
            feedback === "up" ? "bg-success/20 text-success" : "text-on-dark-soft hover:bg-white/10"
          )}
        >
          <ThumbsUp className="size-4" />
        </button>
        <button
          type="button"
          aria-pressed={feedback === "down"}
          onClick={() => setFeedback(feedback === "down" ? null : "down")}
          className={cn(
            "rounded-full p-1.5 transition-colors",
            feedback === "down" ? "bg-error/20 text-error" : "text-on-dark-soft hover:bg-white/10"
          )}
        >
          <ThumbsDown className="size-4" />
        </button>
      </div>
    </div>
  );
}
