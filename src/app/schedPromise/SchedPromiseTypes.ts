import type { TRange } from "@/lib/primatives/tRange/TRange";

// ============================================================================
// TIME FRAME
// ============================================================================

export const TIME_FRAMES = {
  at: { key: "at", label: "At", requiresTime: true },
  before: { key: "before", label: "Before", requiresTime: true },
  after: { key: "after", label: "After", requiresTime: true },
  between: { key: "between", label: "Between", requiresTime: true },
  first: { key: "First Stop", label: "First Stop", requiresTime: false },
  last: { key: "Last Stop", label: "Last Stop", requiresTime: false },
} as const;

export type TimeFrameKey = keyof typeof TIME_FRAMES;
export type TimeFrameValue = (typeof TIME_FRAMES)[TimeFrameKey]["key"];

export type TimeOfDay =
  | { timeFrame: "at" | "before" | "after"; time: string }
  | { timeFrame: "between"; start: string; end: string }
  | { timeFrame: "First Stop" | "Last Stop" }
  | string; // Custom fallback

// ============================================================================
// DAYS OF WEEK
// ============================================================================

export const DAYS_OF_WEEK = {
  Mon: { key: "Mon", label: "Monday", compact: "M" },
  Tue: { key: "Tue", label: "Tuesday", compact: "T" },
  Wed: { key: "Wed", label: "Wednesday", compact: "W" },
  Thr: { key: "Thr", label: "Thursday", compact: "R" },
  Fri: { key: "Fri", label: "Friday", compact: "F" },
  Odd: { key: "Odd", label: "Odd Days", compact: null },
  Even: { key: "Even", label: "Even Days", compact: null },
} as const;

export type DayOfWeekKey = keyof typeof DAYS_OF_WEEK;
export type DayOfWeekValue = (typeof DAYS_OF_WEEK)[DayOfWeekKey]["key"];

// ============================================================================
// GRANULAR / LIQUID
// ============================================================================

export const GRAN_LIQ_TYPES = {
  gran: {
    key: "granLiq",
    value: "Granular only",
    label: "Granular Only",
    aliases: ["gran", "granular", "granular only"],
  },
  liquid: {
    key: "granLiq",
    value: "Liquid only",
    label: "Liquid Only",
    aliases: ["liq", "liquid", "liquid only"],
  },
  hoseOrPush: {
    key: "granLiq",
    value: "Hose or push spreader only",
    label: "Hose or Push Spreader",
    aliases: ["hose or push", "hose or push spreader", "hose or push spreader only"],
  },
} as const;

export type GranLiqKey = keyof typeof GRAN_LIQ_TYPES;
export type GranLiqValue = (typeof GRAN_LIQ_TYPES)[GranLiqKey]["value"];

// ============================================================================
// DATE SCOPE
// ============================================================================

export const DATE_SCOPES = {
  before: { key: "before", label: "Before", requiresPeriod: false },
  after: { key: "after", label: "After", requiresPeriod: false },
  onDate: { key: "on", label: "On Date", requiresPeriod: false },
  weekOf: { key: "week of", label: "Week Of", requiresPeriod: true },
  monthOf: { key: "month of", label: "Month Of", requiresPeriod: true },
} as const;

export type DateScopeKey = keyof typeof DATE_SCOPES;
export type DateScopeValue = (typeof DATE_SCOPES)[DateScopeKey]["key"];

// ============================================================================
// TARGET PERIOD
// ============================================================================

export const TARGET_PERIODS = {
  early: { key: "early", label: "Early" },
  mid: { key: "mid", label: "Mid" },
  late: { key: "late", label: "Late" },
  anyDay: { key: "any day", label: "Any Day" },
} as const;

export type TargetPeriodKey = keyof typeof TARGET_PERIODS;
export type TargetPeriodValue = (typeof TARGET_PERIODS)[TargetPeriodKey]["key"];

// ============================================================================
// DATE TARGET (Discriminated Union)
// ============================================================================

export type DateTarget =
  | {
      dateScope: "before" | "after";
      date: string;
      dateRange: TRange<string>;
    }
  | {
      dateScope: "week of" | "month of";
      targetPeriod: TargetPeriodValue;
      date: string;
      dateRange: TRange<string>;
    }
  | {
      dateScope: "on";
      date: string;
      dateRange: TRange<string>;
    };

// ============================================================================
// SCHEDULE CONDITION
// ============================================================================

export const SCHED_CONDITIONS = {
  weedsUp: { key: "condition", value: "weeds up", label: "Weeds Up" },
  cleanupDone: { key: "condition", value: "cleanup done", label: "Cleanup Done" },
} as const;

export type SchedConditionKey = keyof typeof SCHED_CONDITIONS;
export type SchedConditionValue = (typeof SCHED_CONDITIONS)[SchedConditionKey]["value"];

// ============================================================================
// SCHEDULE PROMISE
// ============================================================================

export type SchedPromise = {
  isPermanent: "true" | "false" | "";
  tech?: string;
  equip?: string;
  condition?: SchedConditionValue | string;
  granLiq?: GranLiqValue;
  dateTarget?: DateTarget;
  timeOfDay?: TimeOfDay;
  daysOfWeek?: DayOfWeekValue[];
  other?: string;
};

export type ParseResult = {
  promise: SchedPromise | null;
  issues: string[];
};

// ============================================================================
// HELPER UTILITIES
// ============================================================================

// Get all keys as array for iteration
export const getTimeFrameKeys = () => Object.keys(TIME_FRAMES) as TimeFrameKey[];
export const getDayOfWeekKeys = () => Object.keys(DAYS_OF_WEEK) as DayOfWeekKey[];
export const getGranLiqKeys = () => Object.keys(GRAN_LIQ_TYPES) as GranLiqKey[];
export const getDateScopeKeys = () => Object.keys(DATE_SCOPES) as DateScopeKey[];
export const getTargetPeriodKeys = () => Object.keys(TARGET_PERIODS) as TargetPeriodKey[];
export const getSchedConditionKeys = () => Object.keys(SCHED_CONDITIONS) as SchedConditionKey[];

// Get values for parsing
export const getTimeFrameValues = () =>
  Object.values(TIME_FRAMES).map((t) => t.key);
export const getDayOfWeekValues = () =>
  Object.values(DAYS_OF_WEEK).map((d) => d.key);
export const getGranLiqValues = () =>
  Object.values(GRAN_LIQ_TYPES).map((g) => g.value);
export const getDateScopeValues = () =>
  Object.values(DATE_SCOPES).map((d) => d.key);
export const getTargetPeriodValues = () =>
  Object.values(TARGET_PERIODS).map((t) => t.key);
export const getSchedConditionValues = () =>
  Object.values(SCHED_CONDITIONS).map((c) => c.value);
