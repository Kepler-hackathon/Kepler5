const NODES = [
  { id: "A", x: 170, y: 28, height: 3 },
  { id: "B", x: 90, y: 108, height: 2 },
  { id: "C", x: 250, y: 108, height: 1 },
  { id: "D", x: 50, y: 188, height: 1 },
];
const EDGES: [string, string][] = [
  ["A", "B"],
  ["A", "C"],
  ["B", "D"],
];

/**
 * The tree slide 14 walks through: A(root)-B,C; B-D. Heights are computed, not decorative
 * — they're the answer the treeHeight function on this slide produces for each node.
 */
export function BinaryTreeDiagram({ className }: { className?: string }) {
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
  return (
    <svg viewBox="0 0 320 230" className={className} role="img" aria-label="Binary tree: root A with children B and C; B has one left child, D.">
      {EDGES.map(([from, to]) => {
        const a = byId[from];
        const b = byId[to];
        return (
          <line
            key={from + to}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--color-hairline)"
            strokeWidth={2}
          />
        );
      })}
      {NODES.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={22} fill="var(--color-canvas)" stroke="var(--color-accent)" strokeWidth={2} />
          <text x={n.x} y={n.y + 6} textAnchor="middle" fontFamily="var(--font-code)" fontSize={16} fill="var(--color-ink)">
            {n.id}
          </text>
          <g transform={`translate(${n.x + 16}, ${n.y - 26})`}>
            <rect width={34} height={18} rx={9} fill="var(--color-surface-cream-strong)" />
            <text x={17} y={13} textAnchor="middle" fontFamily="var(--font-code)" fontSize={10} fill="var(--color-body-strong)">
              h={n.height}
            </text>
          </g>
        </g>
      ))}
    </svg>
  );
}
