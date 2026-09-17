"use client";

import { IconContext } from "@phosphor-icons/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // One weight everywhere (design-taste-frontend §3.C: standardize icon weight globally).
    <IconContext.Provider value={{ weight: "regular" }}>
      <TooltipProvider>
        <ToastProvider>{children}</ToastProvider>
      </TooltipProvider>
    </IconContext.Provider>
  );
}
