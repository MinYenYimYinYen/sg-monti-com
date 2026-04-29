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
  isWeekend
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
    min: format(fnsAddDays(new Date(dateRange.min), -days), "yyyy-MM-dd"),
    max: format(fnsAddDays(new Date(dateRange.max), days), "yyyy-MM-dd"),
  };
}

function addDays(date: string, days: number) {
  return format(fnsAddDays(new Date(date), days), "yyyy-MM-dd");
}

function subDays(date: string, days: number) {
  return format(fnsSubDays(new Date(date), days), "yyyy-MM-dd");
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
  padDateRange,
  addDays,
  subDays,
  isInRange,
  isWeekDay,
  nextMonday,
};
