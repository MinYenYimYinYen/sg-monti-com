import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, parse } from "date-fns";
import { dateParser } from "@/lib/primatives/dates/dateParse";
import type { TRange } from "@/lib/primatives/tRange/TRange";
import { DateScope, TargetPeriod } from "@/app/schedPromise/SchedPromiseTypes";

/**
 * Parses a date string and DateScope into an ISO date range
 * @param dateScope - The scope type (before, after, weekOf, monthOf, onDate)
 * @param dateString - User's input date string (e.g., "12/25", "next monday")
 * @param targetPeriod - For weekOf/monthOf: early, mid, late, or any day
 * @returns ISO date range or undefined if date cannot be parsed
 */
export function parseDateRange(
  dateScope: DateScope,
  dateString: string,
  targetPeriod?: TargetPeriod,
): TRange<string> | undefined {
  // Parse the user's date string to ISO format
  const isoDate = dateParser.tryParseDate(dateString);
  if (!isoDate) return undefined;

  const date = parse(isoDate, "yyyy-MM-dd", new Date());

  switch (dateScope) {
    case DateScope.before:
      return {
        min: "1900-01-01",
        max: isoDate,
      };

    case DateScope.after:
      return {
        min: isoDate,
        max: "3000-12-31",
      };

    case DateScope.onDate:
      return {
        min: isoDate,
        max: isoDate,
      };

    case DateScope.weekOf:
      return parseWeekRange(date, targetPeriod);

    case DateScope.monthOf:
      return parseMonthRange(date, targetPeriod);

    default:
      return undefined;
  }
}

/**
 * Calculates week range based on target period
 * Week starts on Monday (day 1), ends on Friday (day 5)
 */
function parseWeekRange(
  date: Date,
  targetPeriod?: TargetPeriod,
): TRange<string> | undefined {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday

  switch (targetPeriod) {
    case TargetPeriod.early:
      // Mon or Tue (days 1-2)
      return {
        min: format(weekStart, "yyyy-MM-dd"),
        max: format(addDays(weekStart, 1), "yyyy-MM-dd"),
      };

    case TargetPeriod.mid:
      // Tue, Wed, Thu (days 2-4)
      return {
        min: format(addDays(weekStart, 1), "yyyy-MM-dd"),
        max: format(addDays(weekStart, 3), "yyyy-MM-dd"),
      };

    case TargetPeriod.late:
      // Thu, Fri (days 4-5)
      return {
        min: format(addDays(weekStart, 3), "yyyy-MM-dd"),
        max: format(addDays(weekStart, 4), "yyyy-MM-dd"),
      };

    case TargetPeriod.anyDay:
      // Mon-Fri (days 1-5)
      return {
        min: format(weekStart, "yyyy-MM-dd"),
        max: format(addDays(weekStart, 4), "yyyy-MM-dd"),
      };

    default:
      return undefined;
  }
}

/**
 * Calculates month range based on target period
 */
function parseMonthRange(
  date: Date,
  targetPeriod?: TargetPeriod,
): TRange<string> | undefined {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);

  switch (targetPeriod) {
    case TargetPeriod.early:
      // Days 1-10
      return {
        min: format(monthStart, "yyyy-MM-dd"),
        max: format(addDays(monthStart, 9), "yyyy-MM-dd"),
      };

    case TargetPeriod.mid:
      // Days 11-20
      return {
        min: format(addDays(monthStart, 10), "yyyy-MM-dd"),
        max: format(addDays(monthStart, 19), "yyyy-MM-dd"),
      };

    case TargetPeriod.late:
      // Days 21-end
      return {
        min: format(addDays(monthStart, 20), "yyyy-MM-dd"),
        max: format(monthEnd, "yyyy-MM-dd"),
      };

    case TargetPeriod.anyDay:
      // Days 1-end
      return {
        min: format(monthStart, "yyyy-MM-dd"),
        max: format(monthEnd, "yyyy-MM-dd"),
      };

    default:
      return undefined;
  }
}
