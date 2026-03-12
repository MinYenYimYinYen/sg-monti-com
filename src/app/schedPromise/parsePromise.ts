import {
  SchedPromise,
  type ParseResult,
  DATE_SCOPES,
  TIME_FRAMES,
  DAYS_OF_WEEK,
  GRAN_LIQ_TYPES,
  DateScopeValue,
  TargetPeriodValue,
  TimeFrameValue,
  DayOfWeekValue,
  GranLiqValue,
} from "@/app/schedPromise/SchedPromiseTypes";
import { dateParser } from "@/lib/primatives/dates/dateParse";
import { parseDateRange } from "@/app/schedPromise/dateRangeParse";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ParseFieldResult =
  | {
      success: true;
      field: keyof SchedPromise;
      value: any;
    }
  | {
      success: false;
      field?: string;
      issues: string[];
    };

// ============================================================================
// TECH FIELD
// ============================================================================

function stringifyTech(promise: SchedPromise): string | null {
  if (!promise.tech) return null;
  return `tech: ${promise.tech}`;
}

function parseTech(value: string): ParseFieldResult {
  return {
    success: true,
    field: "tech",
    value: value,
  };
}

// ============================================================================
// EQUIP FIELD
// ============================================================================

function stringifyEquip(promise: SchedPromise): string | null {
  if (!promise.equip) return null;
  return `equip: ${promise.equip}`;
}

function parseEquip(value: string): ParseFieldResult {
  return {
    success: true,
    field: "equip",
    value: value,
  };
}

// ============================================================================
// CONDITION FIELD
// ============================================================================

function stringifyCondition(promise: SchedPromise): string | null {
  if (!promise.condition) return null;
  return `condition: ${promise.condition}`;
}

function parseCondition(value: string): ParseFieldResult {
  return {
    success: true,
    field: "condition",
    value: value,
  };
}

// ============================================================================
// GRAN/LIQ FIELD
// ============================================================================

function stringifyGranLiq(promise: SchedPromise): string | null {
  if (!promise.granLiq) return null;
  return `granLiq: ${promise.granLiq}`;
}

function parseGranLiq(value: string): ParseFieldResult {
  const normalized = value.toLowerCase().trim();

  // Check each GRAN_LIQ_TYPE for matching aliases
  for (const config of Object.values(GRAN_LIQ_TYPES)) {
    if (config.aliases.some((alias) => alias.toLowerCase() === normalized)) {
      return {
        success: true,
        field: "granLiq",
        value: config.value,
      };
    }
    if (config.value.toLowerCase() === normalized) {
      return {
        success: true,
        field: "granLiq",
        value: config.value,
      };
    }
  }

  return {
    success: false,
    field: "granLiq",
    issues: [`Invalid granLiq value: "${value}"`],
  };
}

// ============================================================================
// DATE TARGET FIELD
// ============================================================================

function stringifyDateTarget(promise: SchedPromise): string | null {
  if (!promise.dateTarget) return null;

  const { dateScope, date } = promise.dateTarget;

  // Simple scopes: before, after, on
  if (dateScope === "before" || dateScope === "after" || dateScope === "on") {
    return `${dateScope}: ${date}`;
  }

  // Period scopes: week of, month of
  if (dateScope === "week of" || dateScope === "month of") {
    const { targetPeriod } = promise.dateTarget;
    if (!targetPeriod) return null;
    return `${targetPeriod} ${dateScope}: ${date}`;
  }

  return null;
}

function parseDateTargetSimple(
  key: string,
  value: string
): ParseFieldResult {
  // Handles: before, after, on, onDate (legacy alias)
  const isoDate = dateParser.tryParseDate(value);
  if (!isoDate) {
    return {
      success: false,
      field: "dateTarget",
      issues: [`Invalid date format: "${value}" for ${key}`],
    };
  }

  // Normalize "onDate" to "on"
  const normalizedKey = key === "onDate" ? "on" : key;

  const dateRange = parseDateRange(normalizedKey as DateScopeValue, value);
  if (!dateRange) {
    return {
      success: false,
      field: "dateTarget",
      issues: [`Could not calculate date range for ${key}: ${value}`],
    };
  }

  // Type discrimination
  if (normalizedKey === "before" || normalizedKey === "after") {
    return {
      success: true,
      field: "dateTarget",
      value: {
        dateScope: normalizedKey,
        date: isoDate,
        dateRange,
      },
    };
  } else {
    return {
      success: true,
      field: "dateTarget",
      value: {
        dateScope: "on",
        date: isoDate,
        dateRange,
      },
    };
  }
}

function parseDateTargetPeriod(key: string, value: string): ParseFieldResult {
  // Handles: "early week of", "mid month of", etc.
  const targetPeriodMatch = key.match(
    /^(early|mid|late|any day)\s+(week of|month of)$/
  );

  if (!targetPeriodMatch) {
    return {
      success: false,
      field: "dateTarget",
      issues: [`Invalid date target format: "${key}"`],
    };
  }

  const targetPeriod = targetPeriodMatch[1] as TargetPeriodValue;
  const dateScope = targetPeriodMatch[2] as "week of" | "month of";

  const isoDate = dateParser.tryParseDate(value);
  if (!isoDate) {
    return {
      success: false,
      field: "dateTarget",
      issues: [`Invalid date format: "${value}" for ${key}`],
    };
  }

  const dateRange = parseDateRange(dateScope, value, targetPeriod);
  if (!dateRange) {
    return {
      success: false,
      field: "dateTarget",
      issues: [`Could not calculate date range for ${key}: ${value}`],
    };
  }

  return {
    success: true,
    field: "dateTarget",
    value: {
      dateScope,
      targetPeriod,
      date: isoDate,
      dateRange,
    },
  };
}

// ============================================================================
// TIME OF DAY FIELD
// ============================================================================

function stringifyTimeOfDay(promise: SchedPromise): string | null {
  if (!promise.timeOfDay) return null;

  // Custom string
  if (typeof promise.timeOfDay === "string") {
    return `time: ${promise.timeOfDay}`;
  }

  const { timeFrame } = promise.timeOfDay;

  // at, before, after
  if (timeFrame === "at" || timeFrame === "before" || timeFrame === "after") {
    const { time } = promise.timeOfDay;
    if (!time) return null;
    return `${timeFrame}: ${time}`;
  }

  // between
  if (timeFrame === "between") {
    const { start, end } = promise.timeOfDay;
    if (!start || !end) return null;
    return `${timeFrame}: ${start} and ${end}`;
  }

  // First Stop, Last Stop
  if (timeFrame === "First Stop" || timeFrame === "Last Stop") {
    return timeFrame;
  }

  return null;
}

function parseTimeOfDaySimple(
  key: TimeFrameValue,
  value: string
): ParseFieldResult {
  // Handles: at, before, after
  if (key === "at" || key === "before" || key === "after") {
    return {
      success: true,
      field: "timeOfDay",
      value: {
        timeFrame: key,
        time: value,
      },
    };
  }

  return {
    success: false,
    field: "timeOfDay",
    issues: [`Invalid time frame: "${key}"`],
  };
}

function parseTimeOfDayBetween(value: string): ParseFieldResult {
  // Handles: between
  const andIndex = value.indexOf(" and ");
  if (andIndex === -1) {
    return {
      success: false,
      field: "timeOfDay",
      issues: [`Invalid between format: "${value}" (expected "X and Y")`],
    };
  }

  return {
    success: true,
    field: "timeOfDay",
    value: {
      timeFrame: "between",
      start: value.slice(0, andIndex).trim(),
      end: value.slice(andIndex + 5).trim(),
    },
  };
}

function parseTimeOfDayStop(key: string): ParseFieldResult {
  // Handles: First Stop, Last Stop
  if (key === "First Stop" || key === "Last Stop") {
    return {
      success: true,
      field: "timeOfDay",
      value: {
        timeFrame: key,
      },
    };
  }

  return {
    success: false,
    field: "timeOfDay",
    issues: [`Invalid stop type: "${key}"`],
  };
}

function parseTimeOfDayCustom(value: string): ParseFieldResult {
  // Handles: time: custom description
  return {
    success: true,
    field: "timeOfDay",
    value: value, // string fallback
  };
}

// ============================================================================
// DAYS OF WEEK FIELD
// ============================================================================

function stringifyDaysOfWeek(promise: SchedPromise): string | null {
  if (!promise.daysOfWeek || promise.daysOfWeek.length === 0) return null;

  // Sort days in correct order
  const sortedDays: DayOfWeekValue[] = [];
  Object.values(DAYS_OF_WEEK).forEach((config) => {
    if (promise.daysOfWeek?.includes(config.key)) {
      sortedDays.push(config.key);
    }
  });

  return `OK Days: ${sortedDays.join("_")}`;
}

function parseDaysOfWeek(value: string): ParseFieldResult {
  const trimmed = value.trim();

  // Check for Odd/Even
  if (trimmed.toLowerCase() === "odd") {
    return { success: true, field: "daysOfWeek", value: ["Odd"] };
  }
  if (trimmed.toLowerCase() === "even") {
    return { success: true, field: "daysOfWeek", value: ["Even"] };
  }

  // Check for underscore-delimited format
  if (trimmed.includes("_")) {
    const days = trimmed.split("_").map((d) => d.trim());
    const validKeys = Object.values(DAYS_OF_WEEK).map((config) => config.key);
    const parsed = days.filter((day) =>
      validKeys.includes(day as DayOfWeekValue)
    ) as DayOfWeekValue[];

    if (parsed.length > 0) {
      return { success: true, field: "daysOfWeek", value: parsed };
    }
  }

  // Check for compact format (MTWRF)
  const compactMap: Record<string, DayOfWeekValue> = {};
  for (const config of Object.values(DAYS_OF_WEEK)) {
    if (config.compact) {
      compactMap[config.compact] = config.key;
    }
  }

  if (/^[MTWRF]+$/i.test(trimmed)) {
    const days: DayOfWeekValue[] = [];
    for (const char of trimmed.toUpperCase()) {
      const day = compactMap[char];
      if (day && !days.includes(day)) {
        days.push(day);
      }
    }
    if (days.length > 0) {
      return { success: true, field: "daysOfWeek", value: days };
    }
  }

  return {
    success: false,
    field: "daysOfWeek",
    issues: [`Invalid days of week format: "${value}"`],
  };
}

// ============================================================================
// OTHER FIELD
// ============================================================================

function stringifyOther(promise: SchedPromise): string | null {
  if (!promise.other) return null;
  return promise.other;
}

function parseOther(value: string): ParseFieldResult {
  return {
    success: true,
    field: "other",
    value: value,
  };
}

// ============================================================================
// MAIN STRINGIFY FUNCTION
// ============================================================================

/**
 * Converts a SchedPromise object to a compact promise string notation
 * @example stringifyPromise({isPermanent: "true", tech: "John", ...}) => "p[tech: John, ...]"
 */
export function stringifyPromise(promise: SchedPromise): string {
  if (!promise.isPermanent) return "";

  const wrappers = promise.isPermanent === "true" ? ["[", "]"] : ["{", "}"];
  const parts: string[] = [];

  // Call each stringify function in order
  const stringifiers = [
    stringifyTech,
    stringifyEquip,
    stringifyCondition,
    stringifyGranLiq,
    stringifyDateTarget,
    stringifyTimeOfDay,
    stringifyDaysOfWeek,
    stringifyOther,
  ];

  for (const stringify of stringifiers) {
    const part = stringify(promise);
    if (part) {
      parts.push(part);
    }
  }

  return `p${wrappers[0]}${parts.join(", ")}${wrappers[1]}`;
}

// ============================================================================
// FIELD ROUTER - Maps keys to appropriate parsers
// ============================================================================

/**
 * Type guard for DateScope values (simple scopes: before, after, on)
 */
function isDateScopeKey(key: string): key is DateScopeValue {
  const validKeys = Object.values(DATE_SCOPES).map((config) => config.key);
  return validKeys.includes(key as DateScopeValue);
}

/**
 * Check if key is a date scope key or the legacy "onDate" alias
 */
function isDateScopeOrAlias(key: string): boolean {
  return isDateScopeKey(key) || key === "onDate";
}

/**
 * Type guard for TimeFrame values
 */
function isTimeFrameKey(key: string): key is TimeFrameValue {
  const validKeys = Object.values(TIME_FRAMES).map((config) => config.key);
  return validKeys.includes(key as TimeFrameValue);
}

function parseKeyValuePair(key: string, value: string): ParseFieldResult {
  // Simple field lookups
  if (key === "tech") return parseTech(value);
  if (key === "equip") return parseEquip(value);
  if (key === "condition") return parseCondition(value);
  if (key === "granLiq") return parseGranLiq(value);
  if (key === "time") return parseTimeOfDayCustom(value);
  if (key === "OK Days") return parseDaysOfWeek(value);

  // Date scopes
  if (isDateScopeOrAlias(key)) {
    return parseDateTargetSimple(key, value);
  }

  // Period date targets
  if (key.includes("week of") || key.includes("month of")) {
    return parseDateTargetPeriod(key, value);
  }

  // Time frames
  if (isTimeFrameKey(key)) {
    if (key === "at" || key === "before" || key === "after") {
      return parseTimeOfDaySimple(key, value);
    }
    if (key === "between") {
      return parseTimeOfDayBetween(value);
    }
  }

  // Unknown field
  return {
    success: false,
    issues: [`Unknown promise field: "${key}"`],
  };
}

function parseKeylessPart(part: string): ParseFieldResult {
  const trimmed = part.trim();

  // Check for time frame stops (First Stop, Last Stop)
  if (isTimeFrameKey(trimmed)) {
    if (trimmed === "First Stop" || trimmed === "Last Stop") {
      return parseTimeOfDayStop(trimmed);
    } else {
      return {
        success: false,
        field: "timeOfDay",
        issues: [`Time frame "${trimmed}" requires a time value`],
      };
    }
  }

  // Default to "other"
  return parseOther(trimmed);
}

// ============================================================================
// MAIN PARSE FUNCTION
// ============================================================================

/**
 * Parses a tech note string to extract and validate promise notation
 * Uses graceful degradation - preserves valid fields even when some fail to parse
 * @param params - Entity context and tech note
 * @returns ParseResult with promise (if any valid fields) and array of issues
 * @example
 * parsePromiseString({
 *   techNote: "Customer requested p[tech: John, before: 12/25] for service",
 *   entityType: "service",
 *   entityId: 123
 * })
 * => { promise: {...}, issues: [] }
 */
export function parsePromiseString(params: {
  techNote: string;
  entityType: "service" | "program" | "customer";
  entityId: number;
}): ParseResult {
  const { techNote } = params;
  const issues: string[] = [];

  // Extract promise pattern (early return if not found)
  const promiseMatch = techNote.match(/p[\[{][^\]}]*[\]}]/);
  if (!promiseMatch) {
    return { promise: null, issues: [] };
  }

  const promiseString = promiseMatch[0];

  // Determine permanent vs seasonal (early return if invalid)
  let isPermanent: "true" | "false";
  if (promiseString.startsWith("p[") && promiseString.endsWith("]")) {
    isPermanent = "true";
  } else if (promiseString.startsWith("p{") && promiseString.endsWith("}")) {
    isPermanent = "false";
  } else {
    return {
      promise: null,
      issues: [`Invalid promise string format: ${promiseString}`],
    };
  }

  // Extract content (early return if empty)
  const content = promiseString.slice(2, -1).trim();
  if (!content) {
    return { promise: null, issues: ["Empty promise content"] };
  }

  // Initialize promise
  const promise: SchedPromise = { isPermanent };

  // Parse each part - COLLECT ALL ISSUES, DON'T RETURN EARLY
  const parts = splitPromiseParts(content);

  for (const part of parts) {
    const colonIndex = part.indexOf(":");

    let result: ParseFieldResult;

    if (colonIndex === -1) {
      result = parseKeylessPart(part);
    } else {
      const key = part.slice(0, colonIndex).trim();
      const value = part.slice(colonIndex + 1).trim();
      result = parseKeyValuePair(key, value);
    }

    // Apply successful parses, collect issues from failures
    if (result.success) {
      applyFieldToPromise(promise, result);
    } else {
      issues.push(...result.issues);
    }
  }

  // Check for content
  const hasContent = Object.keys(promise).length > 1;

  return {
    promise: hasContent ? promise : null,
    issues,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Apply parsed field to promise object
 */
function applyFieldToPromise(
  promise: SchedPromise,
  result: ParseFieldResult & { success: true }
): void {
  (promise as any)[result.field] = result.value;
}

/**
 * Splits promise string content by commas, respecting nested content
 */
function splitPromiseParts(content: string): string[] {
  const parts: string[] = [];
  let current = "";

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === ",") {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}
