import { useState, useMemo } from "react";
import PlaybackShell from "./PlaybackShell";

/**
 * Computes the frames locally as a working demo. In production, replace
 * this with data the AI generated ahead of time in the shape:
 *   { setup: { array, target }, frames: [...], result: {...} }
 * and pass `frames` straight into <PlaybackShell>. The renderer below
 * (BinarySearchRow) doesn't care where the frames came from.
 */
function computeFrames(array, target) {
  const frames = [];
  let low = 0;
  let high = array.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const val = array[mid];

    if (val === target) {
      frames.push({
        state: { low, high, mid },
        highlight: { current: mid, found: mid },
        narration: `Found ${target} at index ${mid}, in ${frames.length + 1} step(s).`,
      });
      return frames;
    }

    const goRight = val < target;
    frames.push({
      state: { low, high, mid },
      highlight: { current: mid, found: null },
      narration: goRight
        ? `array[${mid}] = ${val} < ${target} — discard the left half, search continues right.`
        : `array[${mid}] = ${val} > ${target} — discard the right half, search continues left.`,
    });

    if (goRight) low = mid + 1;
    else high = mid - 1;
  }

  frames.push({
    state: { low, high, mid: null },
    highlight: { current: null, found: null },
    narration: `${target} is not in the array — low passed high, search terminates.`,
  });
  return frames;
}

function BinarySearchRow({ array, frame }) {
  const { low, high, mid } = frame.state;
  const found = frame.highlight.found;

  return (
    <div className="flex justify-center gap-2 flex-wrap py-4">
      {array.map((val, i) => {
        const labels = [];
        if (mid !== null) {
          if (i === low) labels.push("low");
          if (i === mid) labels.push("mid");
          if (i === high) labels.push("high");
        }
        const inRange = mid !== null && i >= low && i <= high;

        let boxClasses = "bg-slate-900 border-slate-700 text-slate-100";
        if (found === i) {
          boxClasses = "bg-emerald-400 border-emerald-400 text-emerald-950 scale-110";
        } else if (i === mid) {
          boxClasses = "bg-amber-400 border-amber-400 text-amber-950 scale-105";
        } else if (mid !== null && !inRange) {
          boxClasses = "bg-transparent border-slate-800 text-slate-600";
        }

        return (
          <div key={i} className="flex flex-col items-center w-12">
            <div className="h-4 text-[10px] font-mono font-bold text-amber-400">
              {labels.join("/")}
            </div>
            <div
              className={`w-12 h-12 flex items-center justify-center rounded-lg border-2 font-mono font-semibold text-lg transition-all duration-200 ${boxClasses}`}
            >
              {val}
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">{i}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function BinarySearchWidget({
  initialArray = [3, 7, 12, 18, 24, 29, 35, 42, 50, 56, 63],
  initialTarget = 42,
}) {
  const [arrayText, setArrayText] = useState(initialArray.join(", "));
  const [targetText, setTargetText] = useState(String(initialTarget));
  const [applied, setApplied] = useState({ array: initialArray, target: initialTarget });
  const [error, setError] = useState("");

  const frames = useMemo(() => computeFrames(applied.array, applied.target), [applied]);

  function handleRun() {
    const parsed = arrayText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number);

    if (parsed.length === 0 || parsed.some((v) => Number.isNaN(v))) {
      setError("Enter a comma-separated list of numbers.");
      return;
    }

    const sorted = [...parsed].sort((a, b) => a - b);
    const wasSorted = parsed.every((v, i) => v === sorted[i]);

    const t = Number(targetText.trim());
    if (targetText.trim() === "" || Number.isNaN(t)) {
      setError("Enter a numeric target.");
      return;
    }

    setError(wasSorted ? "" : "Array wasn't sorted — sorted it automatically.");
    setApplied({ array: sorted, target: t });
  }

  return (
    <div className="bg-slate-950 text-slate-100 rounded-2xl p-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold mb-4">Binary Search — Interactive</h2>

      <div className="flex flex-wrap gap-3 mb-2">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs text-slate-400 mb-1" htmlFor="bs-array">
            Sorted array
          </label>
          <input
            id="bs-array"
            value={arrayText}
            onChange={(e) => setArrayText(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm text-slate-100"
          />
        </div>
        <div className="w-28">
          <label className="block text-xs text-slate-400 mb-1" htmlFor="bs-target">
            Target
          </label>
          <input
            id="bs-target"
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm text-slate-100"
          />
        </div>
        <button
          type="button"
          onClick={handleRun}
          className="self-end bg-teal-400 text-teal-950 font-semibold px-4 py-2 rounded-lg hover:brightness-110"
        >
          Run search
        </button>
      </div>

      {error && <p className="text-rose-400 text-xs mb-2">{error}</p>}

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mt-4">
        <PlaybackShell frames={frames}>
          {(frame) => <BinarySearchRow array={applied.array} frame={frame} />}
        </PlaybackShell>
      </div>
    </div>
  );
}
