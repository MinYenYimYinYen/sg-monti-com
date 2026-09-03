import type { TRange } from "@/lib/primatives/tRange/TRange";

// ============================================================================
// PROMISE FORMAT
//
// p[...]  — permanent promise
// p{...}  — single-season promise
//
// Content is comma-separated key: value pairs.
// First colon splits key from value. No colon → treated as note: <text>.
//
// Strict-parse keys: date, time, days
//   These must parse correctly for downstream logic to use them.
//   Parse failures are recorded in ParseResult.issues.
//
// Loose keys: tech, equip, condition, granLiq, note
//   Stored as raw strings. Unknown keys go into unknownFields.
// ============================================================================

// ============================================================================
// DATE
// ============================================================================

export type DateScope = "before" | "after" | "on" | "week of" | "month of";
export type DatePeriod = "early" | "mid" | "late" | "any day";

export type ParsedDate = {
  scope: DateScope;
  /** Only present for "week of" and "month of" scopes. Defaults to "any day". */
  period?: DatePeriod;
  /** ISO date string "yyyy-MM-dd" */
  date: string;
  /** Computed date range for downstream scheduling checks */
  dateRange: TRange<string>;
};

// ============================================================================
// TIME
// ============================================================================

export type TimeScope = "at" | "before" | "after" | "between" | "First Stop" | "Last Stop";

// Legacy aliases for files that haven't been updated yet
export type DateScopeValue = DateScope;
export type TargetPeriodValue = DatePeriod;
export type TimeFrameValue = TimeScope;

export type ParsedTimeSimple = { scope: "at" | "before" | "after"; time: string; timeRange: TRange<string> };
export type ParsedTimeBetween = { scope: "between"; start: string; end: string; timeRange: TRange<string> };
export type ParsedTimeStop = { scope: "First Stop" | "Last Stop" };

export type ParsedTime = ParsedTimeSimple | ParsedTimeBetween | ParsedTimeStop;

// ============================================================================
// DAYS OF WEEK
// ============================================================================

export const DAY_CHARS = ["M", "T", "W", "R", "F"] as const;
export type DayChar = (typeof DAY_CHARS)[number];

export const DAY_CHAR_TO_LABEL: Record<DayChar, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  R: "Thr",
  F: "Fri",
};

export type ParsedDays =
  | { kind: "days"; compact: string; chars: DayChar[] }
  | { kind: "special"; special: "Odd" | "Even" };

// ============================================================================
// SCHEDULE PROMISE
// ============================================================================

export type SchedPromise = {
  /** true = p[...] permanent, false = p{...} single-season */
  isPermanent: boolean;

  // Strict-parse fields — null means the key was present but failed to parse
  date?: ParsedDate | null;
  time?: ParsedTime | null;
  days?: ParsedDays | null;

  // Loose fields — raw strings, always stored if key is present
  tech?: string;
  equip?: string;
  condition?: string;
  granLiq?: string;
  note?: string;

  // Catch-all for unrecognized keys
  unknownFields?: Record<string, string>;
};

export type ParseResult = {
  /**
   * The parsed promise object. null only if no p[...] or p{...} pattern
   * is found in the tech note at all.
   */
  promise: SchedPromise | null;
  /** Issues encountered while parsing strict fields. */
  issues: string[];
};
