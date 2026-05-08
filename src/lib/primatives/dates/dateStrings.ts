import {
  format,
  subDays as fnsSubDays,
  addDays as fnsAddDays,
  subWeeks,
  addWeeks,
  subMonths,
  addMonths,
  subYears,
  addYears,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
  isWithinInterval,
  isWeekend,
  differenceInCalendarDays,
} from "date-fns";
import { TRange } from "@/lib/primatives/tRange/TRange";

/**
 * Utility functions that return ISO date strings (yyyy-MM-dd).
 * Mimics date-fns function names but returns strings immediately
 * to avoid timezone confusion throughout the application.
 */

function today(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function daysAgo(n: number): string {
  return format(fnsSubDays(new Date(), n), "yyyy-MM-dd");
}

function daysFromNow(n: number): string {
  return format(fnsAddDays(new Date(), n), "yyyy-MM-dd");
}

function weeksAgo(n: number): string {
  return format(subWeeks(new Date(), n), "yyyy-MM-dd");
}

function weeksFromNow(n: number): string {
  return format(addWeeks(new Date(), n), "yyyy-MM-dd");
}

function monthsAgo(n: number): string {
  return format(subMonths(new Date(), n), "yyyy-MM-dd");
}

function monthsFromNow(n: number): string {
  return format(addMonths(new Date(), n), "yyyy-MM-dd");
}

function yearsAgo(n: number): string {
  return format(subYears(new Date(), n), "yyyy-MM-dd");
}

function yearsFromNow(n: number): string {
  return format(addYears(new Date(), n), "yyyy-MM-dd");
}

function weekStart(): string {
  return format(startOfWeek(new Date()), "yyyy-MM-dd");
}

function weekEnd(): string {
  return format(endOfWeek(new Date()), "yyyy-MM-dd");
}

function monthStart(): string {
  return format(startOfMonth(new Date()), "yyyy-MM-dd");
}

function monthEnd(): string {
  return format(endOfMonth(new Date()), "yyyy-MM-dd");
}

function yearStart(): string {
  return format(startOfYear(new Date()), "yyyy-MM-dd");
}

function yearEnd(): string {
  return format(endOfYear(new Date()), "yyyy-MM-dd");
}

function padDateRange(dateRange: TRange<string>, days: number) {
  return {
    min: format(fnsAddDays(parseISO(dateRange.min), -days), "yyyy-MM-dd"),
    max: format(fnsAddDays(parseISO(dateRange.max), days), "yyyy-MM-dd"),
  };
}

function addDays(date: string, days: number) {
  return format(fnsAddDays(parseISO(date), days), "yyyy-MM-dd");
}

function subDays(date: string, days: number) {
  return format(fnsSubDays(parseISO(date), days), "yyyy-MM-dd");
}

function isInRange(date: string, dateRange: TRange<string>): boolean {
  const parsedDate = parseISO(date);
  const parsedMin = parseISO(dateRange.min);
  const parsedMax = parseISO(dateRange.max);

  return isWithinInterval(parsedDate, { start: parsedMin, end: parsedMax });
}

function isWeekDay(date: string): boolean {
  const parsedDate = parseISO(date);
  return !isWeekend(parsedDate);
}

function nextMonday(date: string): string {
  const parsed = parseISO(date);
  // getDay(): 0=Sun, 1=Mon, ..., 6=Sat
  const day = parsed.getDay();
  // Days until next Monday: Sun→1, Mon→7, Tue→6, Wed→5, Thu→4, Fri→3, Sat→2
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  return format(fnsAddDays(parsed, daysUntilMonday), "yyyy-MM-dd");
}

//If I call this on Saturday, it will return the next Monday
function todayToWeekday() {
  const date = today();
  if (isWeekDay(date)) return date;
  return nextMonday(date);
}

function isValidDateRange(dateRange: TRange<string>): boolean {
  const start = parseISO(dateRange.min);
  const end = parseISO(dateRange.max);
  return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
}

function dateRangeFromDate(
  dateRange: TRange<string>,
  date: string,
): TRange<string> | null {
  if (!isValidDateRange(dateRange)) return null;

  if (dateRange.max < date) return null; // entirely past
  if (dateRange.min > date) return dateRange; // entirely future
  return { min: date, max: dateRange.max }; // today is within range
}

function dateRangeToDate(
  dateRange: TRange<string>,
  date: string,
): TRange<string> | null {
  if (!isValidDateRange(dateRange)) return null;
  if (dateRange.min > date) return null; // entirely future
  if (dateRange.max <= date) return dateRange; // entirely past (all elapsed)
  return { min: dateRange.min, max: date }; // date is within range
}

/**
 * Counts weekdays (Mon–Fri) in a date range, inclusive of both endpoints.
 * O(1) — uses arithmetic instead of allocating a day array.
 */
function countWeekdays(dateRange: TRange<string>): number {
  if (!isValidDateRange(dateRange)) return 0;
  const start = parseISO(dateRange.min);
  const end = parseISO(dateRange.max);

  const totalDays = differenceInCalendarDays(end, start) + 1;
  const fullWeeks = Math.floor(totalDays / 7);
  const remainder = totalDays % 7;

  // Count weekdays in the partial week starting from start's day-of-week
  const startDay = start.getDay(); // 0=Sun, 6=Sat
  let partialWeekdays = 0;
  for (let i = 0; i < remainder; i++) {
    const d = (startDay + i) % 7;
    if (d !== 0 && d !== 6) partialWeekdays++;
  }

  return fullWeeks * 5 + partialWeekdays;
}

function countWeekdaysBetween(dateRange: TRange<string>) {
  return countWeekdays(dateRange) - 1;
}

/** Clamps a date string to [min, max] using lexicographic ISO comparison. */
function clampDate(date: string, min: string, max: string): string {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

export const dateStrings = {
  today,
  daysAgo,
  daysFromNow,
  weeksAgo,
  weeksFromNow,
  monthsAgo,
  monthsFromNow,
  yearsAgo,
  yearsFromNow,
  weekStart,
  weekEnd,
  monthStart,
  monthEnd,
  yearStart,
  yearEnd,
  addDays,
  subDays,
  isInRange,
  isWeekDay,
  nextMonday,
  todayToWeekday,
  clampDate,
};

export const dateRanges = {
  isValidDateRange,
  padDateRange,
  dateRangeFromDate,
  dateRangeToDate,
  countWeekdays,
  countWeekdaysBetween,
};
