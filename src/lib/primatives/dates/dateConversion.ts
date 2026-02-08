import { parseISO, format, isValid } from "date-fns";

/**
 * Converts a strict ISO Date string (YYYY-MM-DD) to a JS Date object.
 * Returns undefined if the string is invalid or empty.
 *
 * Note: This handles "local" dates (YYYY-MM-DD) by parsing them as local time,
 * avoiding timezone shifts that occur with new Date("YYYY-MM-DD").
 */
function toJSDate(isoDateString: string | undefined | null): Date | undefined {
  if (!isoDateString) return undefined;
  const date = parseISO(isoDateString);
  return isValid(date) ? date : undefined;
}

/**
 * Converts a JS Date object to a strict ISO Date string (YYYY-MM-DD).
 */
function toISO(date: Date | undefined | null): string | undefined {
  if (!date || !isValid(date)) return undefined;
  return format(date, "yyyy-MM-dd");
}

export const dateConversion = {
  toJSDate,
  toISO,
};
