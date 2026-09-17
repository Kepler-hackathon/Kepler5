import { cn } from "@/lib/cn";
import {
  CheckGlyph,
  DashGlyph,
  HalfRingGlyph,
  LockGlyph,
  SparkGlyph,
  TriangleExclamationGlyph,
} from "./status-icons";

export type StatusKind =
  | "done"
  | "in-progress"
  | "attention"
  | "not-started"
  | "locked"
  | "ai";

const KIND_STYLES: Record<StatusKind, { icon: typeof CheckGlyph; classes: string }> = {
  done: {
    icon: CheckGlyph,
    classes: "bg-success/15 text-success-text",
  },
  "in-progress": {
    icon: HalfRingGlyph,
    classes: "bg-amber-fill/25 text-warning-text",
  },
  attention: {
    icon: TriangleExclamationGlyph,
    classes: "bg-error/12 text-error",
  },
  "not-started": {
    icon: DashGlyph,
    classes: "bg-hairline/60 text-muted border border-hairline",
  },
  locked: {
    icon: LockGlyph,
    classes: "bg-canvas text-muted border border-hairline",
  },
  ai: {
    icon: SparkGlyph,
    classes: "bg-canvas text-accent-text border border-accent-text/50",
  },
};

/**
 * The one status vocabulary used on every screen (frontend plan §3.3).
 * Status is never color-only: the glyph and label always ship with the color.
 */
export function StatusIndicator({
  kind,
  label,
  srOnlyLabel = false,
  className,
}: {
  kind: StatusKind;
  label: string;
  /** Visually hide the label (e.g. dense list rows) while keeping it for screen readers. */
  srOnlyLabel?: boolean;
  className?: string;
}) {
  const { icon: Icon, classes } = KIND_STYLES[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium font-body",
        classes,
        className
      )}
    >
      <Icon />
      <span className={srOnlyLabel ? "sr-only" : undefined}>{label}</span>
    </span>
  );
}

/** Compact glyph-only version for dense rows — label is still present for AT via aria-label. */
export function StatusGlyph({ kind, label, className }: { kind: StatusKind; label: string; className?: string }) {
  const { icon: Icon, classes } = KIND_STYLES[kind];
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-flex items-center justify-center rounded-full p-1", classes, className)}
    >
      <Icon />
    </span>
  );
}
