import { cn } from "@/lib/cn";

type GlyphProps = { className?: string };

/** Filled check — done / correct / mastered. */
export function CheckGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={cn("size-3.5", className)} aria-hidden>
      <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.14" />
      <path d="M5 8.2 7.1 10.3 11 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Half-filled ring — in progress / moderate. Deliberately not a spinner: it holds still. */
export function HalfRingGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={cn("size-3.5", className)} aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" />
      <path d="M8 2a6 6 0 0 1 0 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Triangle with exclamation — needs attention / wrong / failed. */
export function TriangleExclamationGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={cn("size-3.5", className)} aria-hidden>
      <path d="M8 2.4 14.2 13.2H1.8Z" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8 6.6v3.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.3" r="0.9" fill="currentColor" />
    </svg>
  );
}

/** Dashed ring with a center dash — not started / no data. Never green: absence is not success. */
export function DashGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={cn("size-3.5", className)} aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.2 2.2" />
      <path d="M5.6 8h4.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** Padlock — locked. */
export function LockGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={cn("size-3.5", className)} aria-hidden>
      <rect x="3.4" y="7.2" width="9.2" height="6.4" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.4 7.2V5a2.6 2.6 0 0 1 5.2 0v2.2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

/** Four-point spark — AI generated. Deliberately not an asterisk (too close to Claude's mark). */
export function SparkGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={cn("size-3.5", className)} aria-hidden>
      <path d="M8 1.2c.35 2.55 1.1 4.15 2.3 5.5 1.24 1.2 2.85 1.95 5.5 2.3-2.65.35-4.26 1.1-5.5 2.3-1.2 1.35-1.95 2.95-2.3 5.5-.35-2.55-1.1-4.15-2.3-5.5C4.46 10 2.85 9.25.2 8.9c2.65-.35 4.26-1.1 5.5-2.3C6.9 5.25 7.65 3.65 8 1.2Z" />
    </svg>
  );
}
