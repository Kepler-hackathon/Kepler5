"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export const Drawer = RadixDialog.Root;
export const DrawerTrigger = RadixDialog.Trigger;

/**
 * Non-modal bottom drawer (frontend plan §5/D12 for the Remediation Drawer): the page
 * behind stays scrollable and interactive, and there is deliberately no dimming overlay.
 * `modal={false}` on the Radix root disables the focus trap and pointer-block, matching
 * "Esc closes and returns focus to the quiz" rather than a full modal takeover.
 */
export function DrawerContent({
  title,
  onClose,
  children,
  className,
}: {
  title: React.ReactNode;
  onClose?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Content
        className={cn(
          "drawer-panel fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-[var(--radius-card)] border-t border-hairline bg-canvas shadow-[0_-8px_30px_-8px_rgba(20,20,19,0.25)] focus:outline-none",
          "sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[480px] sm:rounded-[var(--radius-card)] sm:border",
          className
        )}
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-hairline bg-canvas px-6 py-4">
          <RadixDialog.Title asChild>
            <h3 className="text-[24px]">{title}</h3>
          </RadixDialog.Title>
          <RadixDialog.Close
            onClick={onClose}
            aria-label="Close"
            className="mt-1 text-muted hover:text-ink"
          >
            <X className="size-5" />
          </RadixDialog.Close>
        </div>
        <div className="px-6 py-5 overflow-x-hidden">{children}</div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
