import {
  isValid,
  parseISO,
  isAfter,
  isBefore,
  isEqual,
  differenceInDays,
  subDays,
  startOfDay,
  endOfDay,
  isWithinInterval,
  format,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { AppError } from "@/lib/errors/AppError";
import {TRange} from "@/lib/primatives/tRange/TRange";

// import { ValidationError } from "@/utils/types/errors/customErrors";
// import { ValidDateRange } from "@/utils/types/ValidDateRange";
// import { DateTimeRange } from "@/realGreen/types/DateTimeRange";

/**
 * DateCompareOptions defines fallback behavior for date comparison functions
 * when one or both of the dates being compared are invalid or undefined.
 *
 * It provides control over what the function should return (`true` or `false`)
 * in such scenarios, or whether it should throw an error.
 *
 * ### Properties:
 *
 * - `valueUndefinedReturn` (optional):
 *   Specifies the fallback return value when the `value` date is invalid or undefined.
 *     - `true`: Treats the comparison as passed if the `value` is invalid/undefined.
 *     - `false`: Treats the comparison as failed if the `value` is invalid/undefined.
 *     - `undefined` (default): Throws a `ValidationError` when the `value` is invalid.
 *
 * - `comparedToUndefinedReturn` (optional):
 *   Specifies the fallback return value when the `comparedTo` date is invalid or undefined.
 *     - `true`: Treats the comparison as passed if the `comparedTo` is invalid/undefined.
 *     - `false`: Treats the comparison as failed if the `comparedTo` is invalid/undefined.
 *     - `undefined` (default): Throws a `ValidationError` when the `comparedTo` is invalid.
 *
 * ### Example Usage:
 *
 * ```typescript
 * const options: DateCompareOptions = {
 *   valueUndefinedReturn: true, // If `value` is undefined, return true for the comparison.
 *   comparedToUndefinedReturn: false, // If `comparedTo` is undefined, return false for the comparison.
 * };
 *
 * // Scenario: `value` is valid, but `comparedTo` is undefined
 * const result = handleUndefined(
 *   parseDate("2023-10-10"), // Valid date for `value`
 *   undefined, // Invalid/undefined `comparedTo`
 *   options // Options specifying fallback behavior
 * );
 *
 * console.log(result);
 * // Output: false (since `comparedTo` is undefined and options.comparedToUndefinedReturn = false)
 *
 * // If no options were provided (e.g., options is undefined):
 * // A ValidationError would be thrown instead of returning a result:
 * handleUndefined(
 *   parseDate("2023-10-10"),
 *   undefined,
 *   undefined
 * );
 * // Error: "One of the dates is invalid, and no options were provided to handle that."
 * ```
 */

type DateCompareOptions = {
  valueUndefinedReturn: boolean;
  comparedToUndefinedReturn: boolean;
};

// Helper: Check if a string represents a valid date
function isValidDateString(dateStr: string | null | undefined): boolean {
  if (!dateStr) {
    return false;
  }
  try {
    const parsedDate = parseISO(dateStr);
    return isValid(parsedDate);
  } catch {
    return false;
  }
}

// Helper: Parse date string into a Date object
function parseDate(dateStr: string): Date | undefined {
  if (!isValidDateString(dateStr)) {
    return undefined;
  }
  return parseISO(dateStr);
}

// Helper: Perform date comparison
function compareDates(
  value: Date,
  comparedTo: Date,
  operator: string,
): boolean {
  switch (operator) {
    case "GT":
      return isAfter(value, comparedTo);
    case "LT":
      return isBefore(value, comparedTo);
    case "GTE":
      return isAfter(value, comparedTo) || isEqual(value, comparedTo);
    case "LTE":
      return isBefore(value, comparedTo) || isEqual(value, comparedTo);
    case "EQ":
      return isEqual(value, comparedTo);
    case "NE":
      return !isEqual(value, comparedTo);
    default:
      throw new Error(`Unsupported comparison operator: ${operator}`);
  }
}

// Handle cases where values are undefined
function handleUndefined(
  value: Date | undefined,
  comparedTo: Date | undefined,
  options: DateCompareOptions = {
    valueUndefinedReturn: false,
    comparedToUndefinedReturn: false,
  },
): boolean {
  if (!options) {
    // throw new ValidationError(
    //   "One of the dates is invalid, and no options were provided to handle that.",
    //   { value, comparedTo },
    // );
    throw new AppError({
      message:
        "One of the dates is invalid, and no options were provided to handle that.",
      type: "VALIDATION_ERROR",
      data: { value, comparedTo },
    });
  }

  const { valueUndefinedReturn, comparedToUndefinedReturn } = options;

  if (value === undefined && valueUndefinedReturn !== undefined) {
    return valueUndefinedReturn;
  }
  if (comparedTo === undefined && comparedToUndefinedReturn !== undefined) {
    return comparedToUndefinedReturn;
  }

  // throw new ValidationError(
  //   "One of the dates is invalid, and specific options were not provided to handle that.",
  //   { value, comparedTo, options },
  // );
  throw new AppError({
    message:
      "One of the dates is invalid, and specific options were not provided to handle that.",
    type: "VALIDATION_ERROR",
    data: { value, comparedTo, options },
  });
}

// Main comparison functions with consistent variable naming and handleUndefined checks

function GT(params: {
  value: string;
  isGreaterThan: string;
  options: DateCompareOptions;
}): boolean {
  const { value, isGreaterThan, options } = params;
  const parsedValue = parseDate(value);
  const parsedComparedTo = parseDate(isGreaterThan);

  if (!parsedValue || !parsedComparedTo) {
    return handleUndefined(parsedValue, parsedComparedTo, options);
  }
  return compareDates(parsedValue, parsedComparedTo, "GT");
}

function LT(params: {
  value: string;
  isLessThan: string;
  options: DateCompareOptions;
}): boolean {
  const { value, isLessThan, options } = params;
  const parsedValue = parseDate(value);
  const parsedComparedTo = parseDate(isLessThan);

  if (!parsedValue || !parsedComparedTo) {
    return handleUndefined(parsedValue, parsedComparedTo, options);
  }
  return compareDates(parsedValue, parsedComparedTo, "LT");
}

function EQ(params: {
  value: string;
  isEqualTo: string;
  options: DateCompareOptions;
}): boolean {
  const { value, isEqualTo, options } = params;
  const parsedValue = parseDate(value);
  const parsedComparedTo = parseDate(isEqualTo);

  if (!parsedValue || !parsedComparedTo) {
    return handleUndefined(parsedValue, parsedComparedTo, options);
  }
  return compareDates(parsedValue, parsedComparedTo, "EQ");
}

function NE(params: {
  value: string;
  isNotEqualTo: string;
  options: DateCompareOptions;
}): boolean {
  const { value, isNotEqualTo, options } = params;
  const parsedValue = parseDate(value);
  const parsedComparedTo = parseDate(isNotEqualTo);

  if (!parsedValue || !parsedComparedTo) {
    return handleUndefined(parsedValue, parsedComparedTo, options);
  }
  return compareDates(parsedValue, parsedComparedTo, "NE");
}

function GTE(params: {
  value: string;
  isGreaterThanOrEqualTo: string;
  options: DateCompareOptions;
}): boolean {
  const { value, isGreaterThanOrEqualTo, options } = params;
  const parsedValue = parseDate(value);
  const parsedComparedTo = parseDate(isGreaterThanOrEqualTo);

  if (!parsedValue || !parsedComparedTo) {
    return handleUndefined(parsedValue, parsedComparedTo, options);
  }
  return compareDates(parsedValue, parsedComparedTo, "GTE");
}

function LTE(params: {
  value: string;
  isLessThanOrEqualTo: string;
  options: DateCompareOptions;
}): boolean {
  const { value, isLessThanOrEqualTo, options } = params;
  const parsedValue = parseDate(value);
  const parsedComparedTo = parseDate(isLessThanOrEqualTo);

  if (!parsedValue || !parsedComparedTo) {
    return handleUndefined(parsedValue, parsedComparedTo, options);
  }
  return compareDates(parsedValue, parsedComparedTo, "LTE");
}

function GTEandLTE({
  value,
  isGTE,
  isLTE,
  options,
}: {
  value: string | undefined | null;
  isGTE: string | undefined | null;
  isLTE: string | undefined | null;
  options: DateCompareOptions;
}): boolean {
  // Parse the date strings into valid Date objects
  const parsedValue = parseDate(value || "");
  const parsedGTE = parseDate(isGTE || "");
  const parsedLTE = parseDate(isLTE || "");

  // Ensure each boundary and value are correctly handled
  if (!parsedValue || !parsedGTE) {
    return handleUndefined(parsedValue, parsedGTE, options);
  }
  if (!parsedValue || !parsedLTE) {
    return handleUndefined(parsedValue, parsedLTE, options);
  }

  if (!parsedValue || !parsedGTE || !parsedLTE) {
    throw new AppError({
      message: "Values must not be undefined at this point",
      type: "VALIDATION_ERROR",
      data: {
        parsedValue,
        parsedGTE,
        parsedLTE,
      },
    })
    // throw new ValidationError("Values must not be undefined at this point.", {
    //   parsedValue,
    //   parsedGTE,
    //   parsedLTE,
    // });
  }

  // Perform the actual comparisons
  if (parsedLTE === parsedGTE) return parsedValue === parsedLTE;

  const isValidGTE = parsedValue >= parsedGTE; // Validate against GTE boundary
  const isValidLTE = parsedValue <= parsedLTE; // Validate against LTE boundary

  return isValidGTE && isValidLTE; // Return true if both checks pass
}

/**
 * Returns false if dateHi is before dateLo or if days between dateLo and
 * dateHi exceeds maxDiff
 * */
function isWithinDays({
  dateLo,
  dateHi,
  maxDiff,
  options,
}: {
  dateLo: string;
  dateHi: string;
  maxDiff: number;
  options: DateCompareOptions;
}): boolean {
  const dateLoObj = parseDate(dateLo);
  const dateHiObj = parseDate(dateHi);

  if (!dateLoObj || !dateHiObj) {
    return handleUndefined(dateLoObj, dateHiObj, options);
  }

  const diff = differenceInDays(dateHiObj as Date, dateLoObj as Date);

  if (diff < 0) {
    return false;
  }

  return diff <= maxDiff;
}

function isInDayRange(date: string, dayOffset: number): boolean {
  const parsedDate = parseISO(date); // Parse the given date string
  const now = new Date(); // Current time in local system

  // Get user's timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Convert the current time to a timezone-aware date
  const zonedNow = toZonedTime(now, timezone);

  // Calculate the start and end of the target day in the user's timezone
  const startOfTargetDay = subDays(
    startOfDay(fromZonedTime(zonedNow, timezone)),
    -dayOffset,
  );
  const endOfTargetDay = endOfDay(startOfTargetDay);

  // Check if the parsed date falls within the calculated day range
  return isWithinInterval(parsedDate, {
    start: startOfTargetDay,
    end: endOfTargetDay,
  });
}

// Function to check if a given date string is yesterday
function isYesterday(date: string): boolean {
  return isInDayRange(date, -1); // Offset yesterday as -1
}

// Function to check if a given date string is tomorrow
function isTomorrow(date: string): boolean {
  return isInDayRange(date, 1); // Offset tomorrow as +1
}

function isToday(date: string): boolean {
  return isInDayRange(date, 0);
}

export const dateCompare = {
  isValidDateString,
  GT,
  LT,
  EQ,
  NE,
  GTE,
  LTE,
  GTEandLTE,
  isWithinDays,
  isYesterday,
  isTomorrow,
  isToday,
};

type DateToStringOptions =
  | {
      relativeLanguage: true;
      capitalize: boolean;
    }
  | undefined;

export function formatDateStr({
  dateString,
  formatStr,
  options,
}: {
  dateString: string;
  formatStr: "MM/dd/yyyy" | "EEE MM/dd";
  options: DateToStringOptions;
}): string | undefined {
  // Parse the input string into a Date object
  const date = parseISO(dateString);
  if (!isValid(date)) return undefined;

  if (options) {
    const { capitalize, relativeLanguage } = options;
    if (relativeLanguage) {
      if (isToday(dateString)) return capitalize ? "Today" : "today";
      if (isYesterday(dateString))
        return capitalize ? "Yesterday" : "yesterday";
      if (isTomorrow(dateString)) return capitalize ? "Tomorrow" : "tomorrow";
      return "On " + format(date, formatStr);
    }
  }

  // Fallback to using the format string
  return format(date, formatStr);
}

export function isValidDateRange(
  dateRange: TRange<string> | null | undefined,
  options?: { sameSeason?: boolean; maxDays?: number },
) {
  if (!dateRange) {
    return {
      isValid: false,
      msg: "DateRange is undefined.",
    };
  }

  const { min, max } = dateRange;

  if (!min) {
    return { isValid: false, msg: "Start date is undefined." };
  }
  if (!max) {
    return { isValid: false, msg: "End date is undefined." };
  }

  const start = parseDate(min);
  const end = parseDate(max);

  if (!start) {
    return { isValid: false, msg: "Start date is invalid." };
  }
  if (!end) {
    return { isValid: false, msg: "End date is invalid." };
  }

  if (isAfter(start, end)) {
    return { isValid: false, msg: "Start date is after end date." };
  }

  if (options?.maxDays) {
    const diff = Math.abs(differenceInDays(end, start));
    if (diff > options.maxDays) {
      return {
        isValid: false,
        msg: `Date range must be within ${options.maxDays} days.`,
      };
    }
  }

  if (options?.sameSeason) {
    if (start.getFullYear() !== end.getFullYear()) {
      return { isValid: false, msg: "Dates must be in the same year." };
    }
  }

  return {
    isValid: true,
    msg: "",
  };
}
