import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { dateRanges } from "@/lib/primatives/dates/dateStrings";
import { MonthOfYearValue } from "@/components/MonthOfYear/monthOfYearUtil";

const ISO_DATE = "yyyy-MM-dd";

export function monthRange({ year, month }: MonthOfYearValue): TRange<string> {
  const date = new Date(year, month - 1, 1);
  return {
    min: format(startOfMonth(date), ISO_DATE),
    max: format(endOfMonth(date), ISO_DATE),
  };
}

/** True only for a valid range that is exactly the first through last day of one calendar month. */
export function isSingleMonthRange(dateRange: TRange<string> | null): boolean {
  if (!dateRange || !dateRanges.isValidDateRange(dateRange)) return false;
  const month = monthOfYearFromRange(dateRange);
  if (!month) return false;
  const expected = monthRange(month);
  return expected.min === dateRange.min && expected.max === dateRange.max;
}

/** Month containing `dateRange.min`, or null when the range is missing or unparseable. */
export function monthOfYearFromRange(dateRange: TRange<string> | null): MonthOfYearValue | null {
  if (!dateRange) return null;
  const start = parseISO(dateRange.min);
  if (isNaN(start.getTime())) return null;
  return { year: start.getFullYear(), month: start.getMonth() + 1 };
}
