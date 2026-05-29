"use client";

import { useState } from "react";
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
  const { setDateRange } = useInventory();

  // Initialized from lastCheck at mount time. When lastCheck arrives after mount,
  // the parent remounts this component via a key prop, re-running this initializer
  // with the now-available lastCheck value.
  const [localRange, setLocalRange] = useState<TRange<string>>(() => ({
    min: lastCheck?.checkDate ?? "",
    max: dateStrings.today(),
  }));

  const handleSearch = () => {
    if (!localRange.min || !localRange.max) return;
    setDateRange(localRange);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <DateRangePicker value={localRange} onChange={setLocalRange} size="sm" />
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
