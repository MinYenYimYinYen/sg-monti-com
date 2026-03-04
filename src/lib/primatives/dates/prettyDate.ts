import { format, parseISO, isValid } from 'date-fns';

type ErrorHandling = 'throw' | { fallback: string };

/**
 * Formats an ISO date string using date-fns format tokens.
 *
 * @param dateString - ISO 8601 date string (e.g., "2026-02-20T14:30:00")
 * @param formatString - date-fns format string
 * @param onError - How to handle unparsable input: "throw" or { fallback: string }
 *
 * @returns Formatted date string, or fallback if parsing fails
 *
 * @example
 * prettyDate("2026-02-20", "MMM d, yyyy")           // "Feb 20, 2026"
 * prettyDate("2026-02-20", "MMMM do, yyyy")         // "February 20th, 2026"
 * prettyDate("2026-02-20", "EEEE, MMMM d")          // "Thursday, February 20"
 * prettyDate("2026-02-20T14:30:00", "h:mm a")       // "2:30 PM"
 * prettyDate("2026-02-20T14:30:00", "MMM d, h:mm a") // "Feb 20, 2:30 PM"
 * prettyDate("invalid", "MMM d, yyyy", { fallback: "N/A" }) // "N/A"
 * prettyDate("invalid", "MMM d, yyyy", "throw")     // throws Error
 *
 * Common format tokens:
 *
 * Year:
 * - yyyy: 2026 (4-digit year)
 * - yy: 26 (2-digit year)
 *
 * Month:
 * - MMMM: February (full month name)
 * - MMM: Feb (abbreviated month)
 * - MM: 02 (2-digit month)
 * - M: 2 (month number)
 *
 * Day:
 * - dd: 20 (2-digit day)
 * - d: 20 (day number)
 * - do: 20th (day with ordinal)
 *
 * Day of week:
 * - EEEE: Thursday (full day name)
 * - EEE: Thu (abbreviated day)
 *
 * Time:
 * - HH: 14 (24-hour, 2-digit)
 * - H: 14 (24-hour)
 * - hh: 02 (12-hour, 2-digit)
 * - h: 2 (12-hour)
 * - mm: 30 (minutes, 2-digit)
 * - ss: 00 (seconds, 2-digit)
 * - a: PM (AM/PM)
 *
 * See date-fns documentation for all format tokens:
 * https://date-fns.org/docs/format
 */
export function prettyDate(
  dateString: string,
  formatString: string,
  onError: ErrorHandling = 'throw'
): string {
  const date = parseISO(dateString);

  if (!isValid(date)) {
    if (onError === 'throw') {
      throw new Error(`Invalid date string: ${dateString}`);
    }
    return onError.fallback;
  }

  return format(date, formatString);
}
