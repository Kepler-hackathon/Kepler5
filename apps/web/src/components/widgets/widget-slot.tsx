import { CitationChip } from "@/components/ui/badges";
import { SparkGlyph } from "@/components/ui/status-icons";
import { cn } from "@/lib/cn";

/**
 * The deferred widget placeholder (frontend plan §7.1 / Part III §2.1). Every widget the
 * generation system produces ships with a title and plain-text explanation, which this
 * stub shows now and which later becomes the accessible alternative to the real render.
 * Peer-submitted widgets in the forum use this stub rather than a bespoke interactive
 * build per submission, since the review queue hasn't approved (or built) them yet.
 */
export function WidgetSlot({
  typeBadge,
  title,
  explanation,
  citation,
  size = "full",
}: {
  typeBadge: string;
  title: string;
  explanation: string;
  citation?: string;
  size?: "full" | "compact" | "thumbnail";
}) {
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
