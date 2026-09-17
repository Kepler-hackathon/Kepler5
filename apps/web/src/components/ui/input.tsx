import * as React from "react";
import { cn } from "@/lib/cn";

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-[var(--radius-control)] border border-hairline bg-canvas px-3 py-2 text-[14px] text-ink font-body placeholder:text-muted",
        "focus:border-accent-text/60",
        className
      )}
      {...props}
    />
  )
);
TextInput.displayName = "TextInput";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-[var(--radius-control)] border border-hairline bg-canvas px-3 py-2 text-[14px] text-ink font-body placeholder:text-muted",
        "focus:border-accent-text/60",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="text-[13px] font-medium font-body text-ink">
          {label}
        </label>
        {hint ? <span className="text-[12px] text-muted font-body">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
