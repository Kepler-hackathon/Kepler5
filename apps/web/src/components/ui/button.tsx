import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] font-medium font-body transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-button-primary text-on-primary hover:bg-button-primary-hover active:bg-button-primary-hover",
        secondary:
          "bg-canvas text-ink border border-hairline hover:bg-surface-soft active:bg-surface-card",
        ghost: "text-ink hover:bg-surface-soft active:bg-surface-card",
        destructive: "bg-error text-on-primary hover:brightness-95 active:brightness-90",
        success:
          "bg-button-success text-on-primary hover:brightness-95 active:brightness-90",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-5 text-[14px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  /** Shown via aria-describedby when the button is disabled, so "disabled" always explains why. */
  disabledReason?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild, loading, disabled, disabledReason, children, id, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const autoId = React.useId();
    const reasonId = disabledReason ? `${id ?? autoId}-disabled-reason` : undefined;
    // Slot requires exactly one child, so the loading icon can only be spliced in when
    // rendering a plain <button> — asChild callers (e.g. Button asChild + Link) don't
    // combine with `loading` in this app.
    const content = asChild ? (
      children
    ) : (
      <>
        {loading ? <CircleNotch className="animate-spin" aria-hidden /> : null}
        {children}
      </>
    );

    return (
      <>
        <Comp
          ref={ref}
          id={id}
          className={cn(buttonVariants({ variant, size }), className)}
          disabled={disabled || loading}
          aria-describedby={reasonId}
          aria-busy={loading || undefined}
          {...props}
        >
          {content}
        </Comp>
        {disabledReason && (disabled || loading) ? (
          <span id={reasonId} className="sr-only">
            {disabledReason}
          </span>
        ) : null}
      </>
    );
  }
);
Button.displayName = "Button";

export function IconButton({
  className,
  label,
  size = "md",
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: "sm" | "md";
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-control)] text-muted transition-colors hover:bg-surface-soft hover:text-ink active:bg-surface-card disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "size-8 [&_svg]:size-4" : "size-10 [&_svg]:size-5",
        className
      )}
      {...props}
    />
  );
}
