import {
  format,
  subDays,
  addDays,
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
} from "date-fns";

/**
 * Utility functions that return ISO date strings (yyyy-MM-dd).
 * Mimics date-fns function names but returns strings immediately
 * to avoid timezone confusion throughout the application.
 */

function today(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function daysAgo(n: number): string {
  return format(subDays(new Date(), n), "yyyy-MM-dd");
}

function daysFromNow(n: number): string {
  return format(addDays(new Date(), n), "yyyy-MM-dd");
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
};
