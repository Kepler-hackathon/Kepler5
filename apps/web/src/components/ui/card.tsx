import * as React from "react";
import { cn } from "@/lib/cn";

/** Light cream surface — the default content card (design_system.md §3/§4). */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-hairline bg-surface-card",
        className
      )}
      {...props}
    />
  );
}

/** Dark widget/product chrome — trace steppers, code, interactive models. Never the page theme. */
export function DarkCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] bg-surface-dark text-on-dark",
        className
      )}
      {...props}
    />
  );
}
