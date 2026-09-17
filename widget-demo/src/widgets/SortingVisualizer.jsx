import { useState, useMemo } from "react";
import PlaybackShell from "./PlaybackShell";

/**
 * Local bubble-sort frame generator, for demo purposes. Swap this out
 * for AI-generated frames (same shape) to cover insertion/selection/
 * merge/quicksort — the Bars renderer below doesn't change.
 */
function bubbleSortFrames(input) {
  const array = [...input];
  const n = array.length;
  const frames = [
    {
      state: { array: [...array], sortedBoundary: n },
      highlight: {},
      narration: "Starting array.",
    },
  ];

  for (let i = 0; i < n - 1; i++) {
    let swappedAny = false;
    for (let j = 0; j < n - i - 1; j++) {
      frames.push({
        state: { array: [...array], sortedBoundary: n - i },
        highlight: { comparing: [j, j + 1] },
        narration: `Compare index ${j} (${array[j]}) and index ${j + 1} (${array[j + 1]}).`,
      });
      if (array[j] > array[j + 1]) {
        [array[j], array[j + 1]] = [array[j + 1], array[j]];
        swappedAny = true;
        frames.push({
          state: { array: [...array], sortedBoundary: n - i },
          highlight: { swapped: [j, j + 1] },
          narration: `${array[j]} and ${array[j + 1]} were out of order — swapped.`,
        });
      }
    }
    if (!swappedAny) break;
  }

  frames.push({
    state: { array: [...array], sortedBoundary: 0 },
    highlight: {},
    narration: "Array is fully sorted.",
  });
  return frames;
}

function Bars({ frame }) {
  const { array, sortedBoundary } = frame.state;
  const max = Math.max(...array, 1);
  const comparing = frame.highlight.comparing || [];
  const swapped = frame.highlight.swapped || [];

  return (
    <div className="flex items-end justify-center gap-2 h-48 py-4">
      {array.map((val, i) => {
        let barColor = "bg-slate-700";
        if (i >= sortedBoundary) barColor = "bg-emerald-500";
        else if (swapped.includes(i)) barColor = "bg-rose-400";
        else if (comparing.includes(i)) barColor = "bg-amber-400";

        return (
          <div key={i} className="flex flex-col items-center justify-end h-full w-8">
            <span className="text-[11px] font-mono text-slate-300 mb-1">{val}</span>
            <div
              className={`w-8 rounded-t-md transition-all duration-200 ${barColor}`}
              style={{ height: `${(val / max) * 100}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function SortingVisualizer({ initialArray = [29, 10, 14, 37, 6, 22, 3] }) {
  const [arrayText, setArrayText] = useState(initialArray.join(", "));
  const [applied, setApplied] = useState(initialArray);
  const [error, setError] = useState("");

  const frames = useMemo(() => bubbleSortFrames(applied), [applied]);

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
    setError("");
    setApplied(parsed);
  }

  return (
    <div className="bg-slate-950 text-slate-100 rounded-2xl p-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold mb-4">Bubble Sort — Interactive</h2>

      <div className="flex flex-wrap gap-3 mb-2">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs text-slate-400 mb-1" htmlFor="sort-array">
            Array to sort
          </label>
          <input
            id="sort-array"
            value={arrayText}
            onChange={(e) => setArrayText(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm text-slate-100"
          />
        </div>
        <button
          type="button"
          onClick={handleRun}
          className="self-end bg-teal-400 text-teal-950 font-semibold px-4 py-2 rounded-lg hover:brightness-110"
        >
          Sort
        </button>
      </div>

      {error && <p className="text-rose-400 text-xs mb-2">{error}</p>}

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mt-4">
        <PlaybackShell frames={frames}>{(frame) => <Bars frame={frame} />}</PlaybackShell>
      </div>
    </div>
  );
}
