import * as React from "react";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { SparkGlyph } from "./status-icons";

/**
 * "AI generated" attribution badge (frontend plan §6.7 / §1.7).
 * Uppercase 12px/500 with tracked letter-spacing, per design_system.md's AI badge
 * treatment — but the accessible accent-text token, not raw --color-accent (§3.2 D18).
 */
export function AiBadge({
  credit,
  className,
}: {
  /** e.g. "by Alex C. · approved by instructor" (§6.7) */
  credit?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 flex-wrap", className)}>
      <span className="inline-flex items-center gap-1 rounded-full border border-accent-text/50 bg-canvas px-2.5 py-1 text-accent-text">
        <SparkGlyph />
        <span className="text-[11px] font-semibold font-body uppercase tracking-[1.5px]">
          AI generated
        </span>
      </span>
      {credit ? <span className="text-[13px] text-muted font-body">{credit}</span> : null}
    </span>
  );
}

/** Module / Lecture / Slide tag — the most specific one chosen (frontend plan §7.2). */
export function TagChip({
  label,
  onChange,
  unavailable,
  className,
}: {
  label: string;
  onChange?: () => void;
  unavailable?: boolean;
  className?: string;
}) {
  if (unavailable) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border border-hairline bg-surface-soft px-3 py-1 text-[13px] text-muted font-body",
          className
        )}
      >
        No longer available
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-card px-3 py-1 text-[13px] text-ink font-body",
        className
      )}
    >
      {label}
      {onChange ? (
        <button
          type="button"
          onClick={onChange}
          className="font-medium text-accent-text hover:underline underline-offset-2"
        >
          Change
        </button>
      ) : null}
    </span>
  );
}

/** Grounding citation — "Grounded in Lecture 8" / "Slide 14 · Textbook 3.2" (frontend plan §6.4 / §1.4). */
export function CitationChip({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-2.5 py-1 text-[12px] text-muted font-body",
        onClick && "hover:border-accent-text/50 hover:text-accent-text transition-colors",
        className
      )}
    >
      {children}
    </Comp>
  );
}

/** Ungrounded-answer treatment — muted left rule, no citation chip (frontend plan §6.4). */
export function UngroundedNotice({ className }: { className?: string }) {
  return (
    <p className={cn("border-l-2 border-hairline pl-3 text-[13px] text-muted font-body italic", className)}>
      Not found in course materials — general explanation
    </p>
  );
}

export function KeyboardHint({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded-[6px] border border-hairline bg-surface-soft px-1.5 py-0.5 text-[11px] font-medium font-body text-muted">
      {children}
    </kbd>
  );
}

export function DismissibleToast({
  children,
  onDismiss,
}: {
  children: React.ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 text-[14px] text-ink font-body">{children}</div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-muted hover:text-ink"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
