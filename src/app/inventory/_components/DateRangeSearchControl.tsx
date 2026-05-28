"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { inventorySelect } from "@/app/inventory/inventorySelect";
import { useInventory } from "@/app/inventory/useInventory";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Button } from "@/style/components/button";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { Search } from "lucide-react";

export function DateRangeSearchControl() {
  const lastCheck = useSelector(inventorySelect.lastCheck);
  const sessionDateRange = useSelector(inventorySelect.sessionDateRange);
  const { setDateRange } = useInventory();

  // Local input state — separate from the committed Redux dateRange
  const [localRange, setLocalRange] = useState<TRange<string>>({
    min: lastCheck?.checkDate ?? "",
    max: dateStrings.today(),
  });

  // Sync local range from lastCheck on first load (only if session has no committed range yet)
  useEffect(() => {
    if (!sessionDateRange && lastCheck) {
      setLocalRange({ min: lastCheck.checkDate, max: dateStrings.today() });
    }
  }, [lastCheck, sessionDateRange]);

  const handleSearch = () => {
    if (!localRange.min || !localRange.max) return;
    setDateRange(localRange);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <DateRangePicker value={localRange} onChange={setLocalRange} />
      <Button
        variant="primary"
        intensity="solid"
        size="sm"
        onClick={handleSearch}
        disabled={!localRange.min || !localRange.max}
      >
        <Search />
        Search
      </Button>
    </div>
  );
}
