"use client";

import { Minus, Plus } from "@phosphor-icons/react";
import { IconButton } from "@/components/ui/button";

const MIN = 1;
const MAX = 5; // matches the DB CHECK constraint on modules.items_per_lecture

export function ItemsPerLectureStepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <IconButton label="Fewer items per lecture" size="sm" disabled={value <= MIN} onClick={() => onChange(Math.max(MIN, value - 1))}>
        <Minus />
      </IconButton>
      <span className="w-6 text-center text-[15px] font-medium font-body text-ink">{value}</span>
      <IconButton label="More items per lecture" size="sm" disabled={value >= MAX} onClick={() => onChange(Math.min(MAX, value + 1))}>
        <Plus />
      </IconButton>
    </div>
  );
}
