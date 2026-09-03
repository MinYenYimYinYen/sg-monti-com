import { timeParser } from "@/lib/primatives/dates/timeParse";
import type { TRange } from "@/lib/primatives/tRange/TRange";

/**
 * Parses a time string and time frame into a `TRange<string>` of "HH:mm:ss" values.
 *
 * @param timeFrame - "at" | "before" | "after"
 * @param timeString - Human-readable time (e.g., "10am", "2:30 PM", "14:00")
 * @returns TRange<string> or undefined if the time cannot be parsed
 */
export function parseTimeRange(
  timeFrame: "at" | "before" | "after",
  timeString: string,
): TRange<string> | undefined {
  const parsed = timeParser.tryParseTime(timeString);
  if (!parsed) return undefined;

  switch (timeFrame) {
    case "at":
      return { min: parsed, max: parsed };
    case "before":
      return { min: "00:00:00", max: parsed };
    case "after":
      return { min: parsed, max: "23:59:59" };
  }
}

/**
 * Parses two time strings into a `TRange<string>` for "between" time frames.
 *
 * @param startString - Human-readable start time
 * @param endString - Human-readable end time
 * @returns TRange<string> or undefined if either time cannot be parsed
 */
export function parseBetweenTimeRange(
  startString: string,
  endString: string,
): TRange<string> | undefined {
  const start = timeParser.tryParseTime(startString);
  const end = timeParser.tryParseTime(endString);
  if (!start || !end) return undefined;
  return { min: start, max: end };
}
