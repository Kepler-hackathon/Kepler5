import { CitationChip } from "@/components/ui/badges";
import { SparkGlyph } from "@/components/ui/status-icons";
import { cn } from "@/lib/cn";

const sizeClasses: Record<string, string> = {
  full: "aspect-[16/10] w-full",
  compact: "aspect-[4/3] w-full",
  thumbnail: "aspect-[16/9] w-full",
};

/**
 * The deferred widget placeholder (frontend plan §7.1 / Part III §2.1). Every widget the
 * generation system produces ships with a title and plain-text explanation, which this
 * stub shows now and which later becomes the accessible alternative to the real render.
 * Peer-submitted widgets in the forum use this stub rather than a bespoke interactive
 * build per submission, since the review queue hasn't approved (or built) them yet.
 *
 * `loading` = §1.2 input-streaming state (type badge visible, skeleton content).
 * `error`   = §1.2 output-error state (plain-text fallback + error message).
 */
export function WidgetSlot({
  typeBadge,
  title,
  explanation,
  citation,
  size = "full",
  loading,
  error,
}: {
  typeBadge: string;
  title: string;
  explanation: string;
  citation?: string;
  size?: "full" | "compact" | "thumbnail";
  loading?: boolean;
  error?: boolean;
}) {
  if (loading) {
    return (
      <div className={cn(sizeClasses[size], "flex flex-col gap-3 rounded-[var(--radius-card)] bg-surface-dark p-5")}>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-surface-dark-elevated px-2.5 py-1 text-[11px] font-medium font-body text-on-dark-soft uppercase tracking-[0.5px]">
            {typeBadge}
          </span>
          <span className="text-[12px] text-on-dark-soft font-body animate-pulse">Building visualization…</span>
        </div>
        <div className="mt-2 space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-surface-dark-elevated" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-surface-dark-elevated" />
          <div className="h-24 animate-pulse rounded bg-surface-dark-elevated" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(sizeClasses[size], "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] bg-surface-dark p-5 text-center")}>
        <p className="text-[14px] text-on-dark-soft font-body">This visual couldn&rsquo;t be displayed.</p>
        <p className="text-[13px] text-on-dark-soft/60 font-body">
          {explanation ?? "An error occurred while generating this widget."}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] bg-surface-dark text-on-dark",
        size === "full" && "p-6",
        size === "compact" && "p-4",
        size === "thumbnail" && "p-3"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium font-body uppercase tracking-[1px] text-on-dark-soft">
          {typeBadge}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-button-primary px-2.5 py-1 text-[10px] font-semibold font-body uppercase tracking-[1.5px] text-on-primary">
          <SparkGlyph className="size-3" />
          AI generated
        </span>
      </div>
      <h4 className={cn("mt-3 font-display text-on-dark", size === "thumbnail" ? "text-[15px]" : "text-[18px]")}>{title}</h4>
      <p className={cn("mt-1.5 text-on-dark-soft font-body", size === "thumbnail" ? "line-clamp-2 text-[12px]" : "text-[13px] leading-relaxed")}>
        {explanation}
      </p>
      {citation && size !== "thumbnail" ? (
        <div className="mt-3">
          <CitationChip className="border-white/15 bg-transparent text-on-dark-soft">{citation}</CitationChip>
        </div>
      ) : null}
      {size !== "thumbnail" ? (
        <p className="mt-4 text-[12px] italic text-on-dark-soft font-body">Interactive version coming soon</p>
      ) : null}
    </div>
  );
}
