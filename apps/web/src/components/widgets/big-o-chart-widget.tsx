"use client";

import * as React from "react";
import { ThumbsUp, ThumbsDown } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { SparkGlyph } from "@/components/ui/status-icons";

export type BigOFn = "O(1)" | "O(log N)" | "O(N)" | "O(N log N)" | "O(N²)" | "O(2^N)";

export interface BigOSeries {
  fn: BigOFn;
  color: string;
  highlighted?: boolean;
}

interface Props {
  title: string;
  description?: string;
  complexities: BigOSeries[];
  maxN?: number;
}

function evaluate(fn: BigOFn, n: number): number {
  if (n <= 0) return 0;
  switch (fn) {
    case "O(1)":       return 1;
    case "O(log N)":   return Math.log2(n);
    case "O(N)":       return n;
    case "O(N log N)": return n * Math.log2(n);
    case "O(N²)":      return n * n;
    case "O(2^N)":     return Math.min(Math.pow(2, n), 1e6);
  }
}

const W = 280, H = 160;
const PAD = { top: 8, right: 60, bottom: 24, left: 28 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export function BigOChartWidget({ title, description, complexities, maxN = 20 }: Props) {
  const [cursorN, setCursorN] = React.useState(Math.round(maxN / 2));
  const [feedback, setFeedback] = React.useState<"up" | "down" | null>(null);

  const ns = Array.from({ length: maxN }, (_, i) => i + 1);

  // Compute per-series max to normalise together
  const allVals = complexities.flatMap(s => ns.map(n => evaluate(s.fn, n)));
  const globalMax = Math.max(...allVals, 1);

  function toX(n: number) {
    return PAD.left + ((n - 1) / (maxN - 1)) * PLOT_W;
  }
  function toY(val: number) {
    return PAD.top + PLOT_H - (Math.min(val, globalMax) / globalMax) * PLOT_H;
  }

  const cursorX = toX(cursorN);

  return (
    <div className="rounded-[var(--radius-card)] bg-surface-dark p-6 text-on-dark">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium font-body uppercase tracking-[1px] text-on-dark-soft">
          Big-O · {title}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-button-primary px-3 py-1 text-[11px] font-semibold font-body uppercase tracking-[1.5px] text-on-primary">
          <SparkGlyph />
          AI generated
        </div>
      </div>

      {description && (
        <p className="mt-3 text-[14px] leading-relaxed text-on-dark-soft font-body">{description}</p>
      )}

      {/* Chart */}
      <div className="mt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map(t => (
            <line
              key={t}
              x1={PAD.left} y1={PAD.top + PLOT_H * (1 - t)}
              x2={PAD.left + PLOT_W} y2={PAD.top + PLOT_H * (1 - t)}
              stroke="rgba(255,255,255,0.07)" strokeWidth="1"
            />
          ))}

          {/* Axes */}
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PLOT_H + 4}
            stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1={PAD.left - 4} y1={PAD.top + PLOT_H} x2={PAD.left + PLOT_W} y2={PAD.top + PLOT_H}
            stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

          {/* Axis labels */}
          <text x={PAD.left} y={H - 4} fontSize="8" fill="rgba(255,255,255,0.35)" fontFamily="monospace">1</text>
          <text x={PAD.left + PLOT_W - 8} y={H - 4} fontSize="8" fill="rgba(255,255,255,0.35)" fontFamily="monospace">{maxN}</text>
          <text x={4} y={PAD.top + 6} fontSize="8" fill="rgba(255,255,255,0.35)" fontFamily="monospace" textAnchor="middle" transform={`rotate(-90,4,${PAD.top + PLOT_H / 2})`}>ops</text>

          {/* Complexity curves */}
          {complexities.map((s) => {
            const pts = ns.map(n => `${toX(n).toFixed(1)},${toY(evaluate(s.fn, n)).toFixed(1)}`).join(" ");
            return (
              <polyline
                key={s.fn}
                points={pts}
                fill="none"
                stroke={s.color}
                strokeWidth={s.highlighted ? 2.5 : 1.5}
                strokeOpacity={s.highlighted ? 1 : 0.7}
              />
            );
          })}

          {/* Cursor line */}
          <line x1={cursorX} y1={PAD.top} x2={cursorX} y2={PAD.top + PLOT_H}
            stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 2" />

          {/* Right-side labels at N=maxN */}
          {complexities.map((s) => {
            const labelY = toY(evaluate(s.fn, maxN));
            return (
              <text key={s.fn} x={PAD.left + PLOT_W + 4} y={Math.max(PAD.top + 6, Math.min(H - 8, labelY + 3))}
                fontSize="8.5" fill={s.color} fontFamily="monospace">
                {s.fn}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Slider */}
      <div className="mt-2">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="font-code text-[13px] text-on-dark">N = {cursorN}</span>
          <span className="text-[11px] text-on-dark-soft font-body">drag to explore</span>
        </div>
        <input
          type="range" min={1} max={maxN} value={cursorN}
          onChange={e => setCursorN(Number(e.target.value))}
          className="w-full cursor-pointer"
          style={{ accentColor: "var(--color-button-primary)" }}
        />
      </div>

      {/* Value table at cursor N */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
        {complexities.map(s => {
          const val = evaluate(s.fn, cursorN);
          const display = val >= 1e6 ? "∞" : val >= 1000 ? `${(val / 1000).toFixed(1)}K` : val < 10 ? val.toFixed(2) : Math.round(val).toLocaleString();
          return (
            <div key={s.fn} className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="font-code text-[12px] text-on-dark-soft">{s.fn}</span>
              <span className={cn("ml-auto font-code text-[12px]", s.highlighted ? "text-on-dark font-semibold" : "text-on-dark-soft")}>
                {display}
              </span>
            </div>
          );
        })}
      </div>

      {/* Helpful */}
      <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
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
