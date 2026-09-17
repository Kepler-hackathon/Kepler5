import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

/**
 * Generic playback shell shared by every step-based widget.
 *
 * Props:
 *   frames: [{ state, highlight, narration }, ...]  — the AI-generated data
 *   intervalMs: auto-play speed
 *   children: (frame, index) => JSX — the widget-specific renderer for one frame
 *
 * This component owns scrubbing, play/pause, and the narration line.
 * It never needs to change when you add a new widget type — only the
 * `children` render function differs per widget.
 */
export default function PlaybackShell({ frames, intervalMs = 1100, children }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [frames]);

  const isLast = index === frames.length - 1;
  const isFirst = index === 0;

  useEffect(() => {
    if (!playing) return undefined;
    if (isLast) {
      setPlaying(false);
      return undefined;
    }
    timerRef.current = setTimeout(() => {
      setIndex((i) => Math.min(i + 1, frames.length - 1));
    }, intervalMs);
    return () => clearTimeout(timerRef.current);
  }, [playing, index, isLast, frames.length, intervalMs]);

  if (!frames || frames.length === 0) return null;

  const frame = frames[index];

  return (
    <div className="w-full">
      <div className="min-h-[2.5rem] text-sm text-slate-400 font-mono mb-3">
        {frame.narration}
      </div>

      <div className="mb-2">{children(frame, index)}</div>

      <div className="flex items-center gap-3 border-t border-slate-700 pt-4 mt-4">
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setIndex((i) => Math.max(0, i - 1));
          }}
          disabled={isFirst}
          aria-label="Previous step"
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-700 text-slate-200 disabled:opacity-30 hover:border-teal-400 hover:text-teal-400"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause" : "Play"}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-700 text-slate-200 hover:border-teal-400 hover:text-teal-400"
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setIndex((i) => Math.min(frames.length - 1, i + 1));
          }}
          disabled={isLast}
          aria-label="Next step"
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-700 text-slate-200 disabled:opacity-30 hover:border-teal-400 hover:text-teal-400"
        >
          <ChevronRight size={16} />
        </button>

        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={index}
          onChange={(e) => {
            setPlaying(false);
            setIndex(Number(e.target.value));
          }}
          className="flex-1 accent-teal-400"
          aria-label="Scrub through steps"
        />

        <span className="text-xs font-mono text-slate-400 w-20 text-right shrink-0">
          Step {index + 1} / {frames.length}
        </span>
      </div>
    </div>
  );
}
