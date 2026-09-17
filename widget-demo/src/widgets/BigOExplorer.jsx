import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

/**
 * This widget doesn't use PlaybackShell — it's slider-driven rather than
 * step-based, since there's no discrete "sequence of events" to scrub
 * through, just a continuous variable (n) to explore.
 */
const CURVES = [
  { key: "O(1)", fn: () => 1, color: "#4FD8C4" },
  { key: "O(log n)", fn: (n) => Math.log2(Math.max(n, 1)), color: "#60A5FA" },
  { key: "O(n)", fn: (n) => n, color: "#F2B705" },
  { key: "O(n log n)", fn: (n) => n * Math.log2(Math.max(n, 1)), color: "#FB923C" },
  { key: "O(n^2)", fn: (n) => n * n, color: "#FB7185" },
  { key: "O(2^n)", fn: (n) => Math.pow(2, n), color: "#C084FC" },
];

export default function BigOExplorer({ maxN = 20 }) {
  const [n, setN] = useState(8);

  const data = useMemo(() => {
    const rows = [];
    for (let i = 1; i <= maxN; i++) {
      const row = { n: i };
      CURVES.forEach((c) => {
        row[c.key] = Math.round(c.fn(i) * 100) / 100;
      });
      rows.push(row);
    }
    return rows;
  }, [maxN]);

  const valuesAtN = CURVES.map((c) => ({
    key: c.key,
    value: Math.round(c.fn(n) * 100) / 100,
    color: c.color,
  }));

  return (
    <div className="bg-slate-950 text-slate-100 rounded-2xl p-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold mb-1">Big-O Growth Rates</h2>
      <p className="text-sm text-slate-400 mb-4">
        Drag the slider to see how each complexity class grows at a given input size.
      </p>

      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#2A3061" strokeDasharray="3 3" />
            <XAxis dataKey="n" stroke="#8890B5" fontSize={11} />
            <YAxis stroke="#8890B5" fontSize={11} />
            <Tooltip contentStyle={{ background: "#191E3D", border: "1px solid #2A3061", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine x={n} stroke="#E7E9F7" strokeDasharray="4 4" />
            {CURVES.map((c) => (
              <Line key={c.key} type="monotone" dataKey={c.key} stroke={c.color} dot={false} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4">
        <input
          type="range"
          min={1}
          max={maxN}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          className="w-full accent-teal-400"
          aria-label="Input size n"
        />
        <div className="text-center text-sm font-mono text-slate-300 mt-1">n = {n}</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
        {valuesAtN.map((v) => (
          <div
            key={v.key}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between"
          >
            <span className="text-xs font-mono" style={{ color: v.color }}>
              {v.key}
            </span>
            <span className="text-xs font-mono text-slate-200">{v.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
