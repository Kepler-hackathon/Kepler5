"use client";

import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/** Thin Radix wrapper, warm-editorial styling — follows the tabs.tsx/dialog.tsx convention. */
export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  return (
    <RadixCheckbox.Root
      id={id}
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(v === true)}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-[6px] border border-hairline bg-canvas transition-colors",
        "data-[state=checked]:border-button-primary data-[state=checked]:bg-button-primary",
        "disabled:cursor-not-allowed disabled:opacity-45",
        className
      )}
    >
      <RadixCheckbox.Indicator>
        <Check className="size-3.5 text-on-primary" weight="bold" />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
}
