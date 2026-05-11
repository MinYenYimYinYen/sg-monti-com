"use client";

import { useState } from "react";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";

type MiniServCodeDateEditProps = {
  servCode: ServCodeDeep;
  /** The trigger element — rendered as-is with a pointer cursor, opens the popover on click */
  children: React.ReactNode;
};

/**
 * Lightweight date-range-only edit popover for the AssignmentMatrix.
 * Employee assignment is handled by the matrix checkboxes — this component
 * only exposes the date range picker.
 */
export function MiniServCodeDateEdit({ servCode, children }: MiniServCodeDateEditProps) {
  const [open, setOpen] = useState(false);
  const [localRange, setLocalRange] = useState<TRange<string>>(servCode.dateRange);

  const { updateServCode } = useProgServ({});

  function handleRangeChange(range: TRange<string>) {
    setLocalRange(range);
    updateServCode({ servCodeId: servCode.servCodeId, dateRange: range });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="cursor-pointer" role="button" tabIndex={0}>
          {children}
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="start">
        <div className="bg-popover rounded-md overflow-hidden">
          {/* Header */}
          <div className="bg-accent/20 px-4 py-3 border-b">
            <p className="text-sm font-semibold text-foreground">
              {servCode.servCodeId}
            </p>
            {servCode.progCode?.progCodeId && (
              <p className="text-xs text-muted-foreground">
                {servCode.progCode.progCodeId}
              </p>
            )}
          </div>

          <div className="px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
              Date Range
            </p>
            <DateRangePicker value={localRange} onChange={handleRangeChange} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
