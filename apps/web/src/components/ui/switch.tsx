"use client";

import * as RadixSwitch from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

/** Thin Radix wrapper, warm-editorial styling — follows the tabs.tsx/dialog.tsx convention. */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border border-hairline bg-hairline/60 transition-colors",
        "data-[state=checked]:border-button-primary data-[state=checked]:bg-button-primary",
        "disabled:cursor-not-allowed disabled:opacity-45",
        className
      )}
    >
      <RadixSwitch.Thumb className="block size-4 translate-x-1 rounded-full bg-canvas shadow transition-transform data-[state=checked]:translate-x-6" />
    </RadixSwitch.Root>
  );
}
