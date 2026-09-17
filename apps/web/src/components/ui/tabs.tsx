"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

export const Tabs = RadixTabs.Root;

/**
 * forceMount + data-state styling, not the default unmount-when-inactive behavior —
 * switching tabs must not reset state (e.g. an in-progress AI Copilot conversation).
 */
export function TabPanel({ className, ...props }: React.ComponentProps<typeof RadixTabs.Content>) {
  return (
    <RadixTabs.Content
      forceMount
      className={cn("data-[state=inactive]:hidden", className)}
      {...props}
    />
  );
}

export function TabList({ className, ...props }: React.ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn("flex gap-6 border-b border-hairline px-1", className)}
      {...props}
    />
  );
}

export function TabTrigger({ className, children, ...props }: React.ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "relative -mb-px border-b-2 border-transparent px-1 py-3 text-[14px] font-medium font-body text-muted transition-colors duration-[var(--duration-tab)]",
        "data-[state=active]:border-button-primary data-[state=active]:text-ink",
        "hover:text-ink",
        className
      )}
      {...props}
    >
      {children}
    </RadixTabs.Trigger>
  );
}
