import { cn } from "@/lib/cn";

/**
 * Base shimmer block. Shimmer is disabled under prefers-reduced-motion globally
 * (globals.css collapses all animation-duration to ~0), leaving a static placeholder.
 */
function Block({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-control)] bg-hairline/70",
        className
      )}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-[var(--radius-card)] border border-hairline bg-surface-card p-4 space-y-3", className)}>
      <Block className="h-4 w-2/3" />
      <Block className="h-3 w-full" />
      <Block className="h-3 w-4/5" />
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 p-3", className)}>
      <Block className="size-8 rounded-full" />
      <Block className="h-3 flex-1" />
      <Block className="h-3 w-16" />
    </div>
  );
}

export function SkeletonSlide({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-[var(--radius-card)] bg-surface-soft p-8 space-y-4", className)}>
      <Block className="h-6 w-1/2" />
      <Block className="h-40 w-full" />
      <Block className="h-3 w-3/4" />
    </div>
  );
}

export function SkeletonWidget({ className, statusLine }: { className?: string; statusLine?: string }) {
  return (
    <div className={cn("rounded-[var(--radius-card)] bg-surface-dark p-6 space-y-4", className)}>
      <div className="flex items-center gap-2">
        <div className="h-5 w-24 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="h-32 w-full animate-pulse rounded-[var(--radius-control)] bg-white/5" />
      {statusLine ? (
        <p aria-live="polite" className="text-[13px] text-on-dark-soft font-body">
          {statusLine}
        </p>
      ) : null}
    </div>
  );
}

export function SkeletonChatBubble({ align = "left", className }: { align?: "left" | "right"; className?: string }) {
  return (
    <div className={cn("flex", align === "right" ? "justify-end" : "justify-start", className)}>
      <Block className={cn("h-10 rounded-[var(--radius-card)]", align === "right" ? "w-1/2" : "w-2/3")} />
    </div>
  );
}
