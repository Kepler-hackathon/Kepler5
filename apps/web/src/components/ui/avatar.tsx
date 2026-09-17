import { cn } from "@/lib/cn";

// Tonal variations of the locked palette (accent / amber / success / muted) rather than
// new hues — an avatar needs to read as "different person," not introduce a second
// accent family into the page (frontend plan §3.2's token set is the whole palette).
const PALETTE = [
  "bg-accent-text/12 text-accent-text",
  "bg-success/15 text-success-text",
  "bg-amber-fill/25 text-warning-text",
  "bg-muted/15 text-body-strong",
  "bg-surface-cream-strong text-muted",
];

function paletteFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * Authorship avatar only — forum authors, widget creators, review-queue submitters.
 * Never the current user: this build has no accounts to represent (D4).
 */
export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium font-body",
        size === "sm" ? "size-6 text-[10px]" : "size-8 text-[12px]",
        paletteFor(name),
        className
      )}
      aria-hidden
    >
      {initialsFor(name)}
    </span>
  );
}
