"use client";

import * as React from "react";
import * as RadixToast from "@radix-ui/react-toast";
import { cn } from "@/lib/cn";

type ToastItem = { id: number; message: React.ReactNode; action?: { label: string; onClick: () => void } };

const ToastCtx = React.createContext<{ push: (t: Omit<ToastItem, "id">) => void } | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((t: Omit<ToastItem, "id">) => {
    setItems((prev) => [...prev, { ...t, id: Date.now() + Math.random() }]);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      <RadixToast.Provider swipeDirection="right" duration={5000}>
        {children}
        {items.map((item) => (
          <RadixToast.Root
            key={item.id}
            onOpenChange={(open) => {
              if (!open) setItems((prev) => prev.filter((t) => t.id !== item.id));
            }}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-control)] border border-hairline bg-ink px-4 py-3 text-[13px] text-canvas font-body shadow-lg",
              "data-[state=open]:animate-none"
            )}
          >
            <RadixToast.Description className="flex-1">{item.message}</RadixToast.Description>
            {item.action ? (
              <RadixToast.Action asChild altText={item.action.label}>
                <button
                  onClick={item.action.onClick}
                  className="font-medium text-accent shrink-0 hover:underline underline-offset-2"
                >
                  {item.action.label}
                </button>
              </RadixToast.Action>
            ) : null}
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-6 right-6 z-[60] flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2" />
      </RadixToast.Provider>
    </ToastCtx.Provider>
  );
}
