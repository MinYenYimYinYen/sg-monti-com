"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import {
  clampMonthForYear,
  MonthOfYearValue,
  monthName,
  monthOfYearOptions,
  monthsForYear,
  yearsOfOptions,
} from "@/components/MonthOfYear/monthOfYearUtil";

type MonthOfYearProps = {
  value: MonthOfYearValue;
  onChangeAction: (value: MonthOfYearValue) => void;
};

/**
 * Controlled month + year dropdowns. Choices run from 18 months back to 1 month forward of the
 * current month. Generic primitive: it holds no Redux state, the caller owns `value`.
 */
export function MonthOfYear({ value, onChangeAction }: MonthOfYearProps) {
  // Lazy initializer keeps `new Date()` out of render, and freezes the window for this mount.
  const [options] = useState(() => monthOfYearOptions({ today: new Date() }));
  const years = yearsOfOptions(options);
  const months = monthsForYear({ options, year: value.year });

  const handleYearChange = (yearText: string) => {
    const year = Number(yearText);
    onChangeAction({
      year,
      month: clampMonthForYear({ options, year, month: value.month }),
    });
  };

  const handleMonthChange = (monthText: string) => {
    onChangeAction({ year: value.year, month: Number(monthText) });
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        variant="shadcnDefault"
        className="w-40"
        value={String(value.month)}
        onValueChange={handleMonthChange}
      >
        <SelectTrigger variant="default">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month} value={String(month)}>
              {monthName(month)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        variant="shadcnDefault"
        className="w-28"
        value={String(value.year)}
        onValueChange={handleYearChange}
      >
        <SelectTrigger variant="default">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
