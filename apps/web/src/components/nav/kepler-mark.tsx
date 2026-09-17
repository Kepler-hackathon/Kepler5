/**
 * Distinct KeplerLearn mark — an orbit, not the spec's "radial asterisk" (too close to
 * Claude's own mark, per frontend plan §3.7 brand rule).
 */
export function KeplerMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <ellipse cx="12" cy="12" rx="10" ry="4.2" stroke="var(--color-accent)" strokeWidth="1.6" transform="rotate(-18 12 12)" />
      <circle cx="12" cy="12" r="2.6" fill="var(--color-button-primary)" />
    </svg>
  );
}
