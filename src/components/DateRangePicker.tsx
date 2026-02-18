"use client";

import * as React from "react";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { DatePicker } from "@/components/DatePicker";
import { cn } from "@/lib/tailwindUtils";
import { validateDateRange } from "@/lib/primatives/dates/dateRangeSchema";

interface DateRangePickerProps {
  value?: TRange<string>;
  onChange?: (value: TRange<string>) => void;
  className?: string;
}

export function DateRangePicker({
  value = { min: "", max: "" },
  onChange,
  className,
}: DateRangePickerProps) {
  const handleMinChange = (date: string) => {
    onChange?.({
      ...value,
      min: date,
    });
  };

  const handleMaxChange = (date: string) => {
    onChange?.({
      ...value,
      max: date,
    });
  };

  const validation = validateDateRange(value);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DatePicker
        value={value.min}
        onChange={handleMinChange}
        placeholder="Start"
        isInvalid={!!validation.errors?.min}
      />
      <span className="text-muted-foreground text-sm">to</span>
      <DatePicker
        value={value.max}
        onChange={handleMaxChange}
        placeholder="End"
        isInvalid={!!validation.errors?.max}
      />
    </div>
  );
}
