import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  className,
  label,
}: {
  /** 0-100 */
  value: number;
  className?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-hairline", className)}
    >
      <div
        className="h-full rounded-full bg-button-primary transition-[width] duration-300 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/** Amber ring + % for "in progress" lecture rows and mastery indicators (§3.3). */
export function ProgressRing({
  value,
  size = 32,
  strokeWidth = 3,
  className,
  showLabel = true,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <span className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${clamped}% complete`}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--color-hairline)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-amber-fill)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {showLabel && size >= 28 ? (
        <span className="absolute text-[9px] font-medium font-body text-warning-text">{clamped}%</span>
      ) : null}
    </span>
  );
}
