"use client";

import { useState } from "react";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { SaveButton, SaveStatus } from "@/components/SaveButton";

type DateRangeEditorProps = {
  servCodeId: string;
  dateRange: TRange<string>;
};

export function DateRangeEditor({
  servCodeId,
  dateRange,
}: DateRangeEditorProps) {
  const [localRange, setLocalRange] = useState<TRange<string>>(dateRange);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const { updateServCode } = useProgServ({});

  const isDirty =
    localRange.min !== dateRange.min || localRange.max !== dateRange.max;

  function handleChange(range: TRange<string>) {
    setLocalRange(range);
    updateServCode({ servCodeId, dateRange: range });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <DateRangePicker value={localRange} onChange={handleChange} />
        {isDirty && (
          <SaveButton
            status={saveStatus}
            onSuccessComplete={() => setSaveStatus("idle")}
            size="sm"
          >
            Save
          </SaveButton>
        )}
      </div>
    </div>
  );
}
