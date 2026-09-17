"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="dialog-overlay fixed inset-0 z-40 bg-ink/40" />
      <RadixDialog.Content
        className={cn(
          "dialog-content fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-hairline bg-canvas p-6 shadow-xl focus:outline-none",
          className
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <RadixDialog.Title className="text-[24px] font-display text-ink">{title}</RadixDialog.Title>
          <RadixDialog.Close className="text-muted hover:text-ink" aria-label="Close">
            <X className="size-5" />
          </RadixDialog.Close>
        </div>
        {description ? (
          <RadixDialog.Description className="mt-2 text-[14px] text-muted font-body">
            {description}
          </RadixDialog.Description>
        ) : null}
        <div className="mt-5">{children}</div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
