import {
  DateScope,
  DayOfWeek,
  GranLiq,
  SchedCondition,
  SchedPromiseDraft,
  TargetPeriod,
  TimeFrame,
  type ParseResult,
  type PromiseValidationIssue,
} from "@/app/schedPromise/SchedPromiseTypes";
import { dateParser } from "@/lib/primatives/dates/dateParse";
import { parseDateRange } from "@/app/schedPromise/dateRangeParse";

/**
 * Converts a SchedPromiseDraft object to a compact promise string notation
 * @example stringifyPromise({isPermanent: "true", tech: "John", ...}) => "p[tech: John, ...]"
 */
export function stringifyPromise(promise: SchedPromiseDraft): string {
  if (!promise.isPermanent) return "";

  const wrappers = promise.isPermanent === "true" ? ["[", "]"] : ["{", "}"];
  const parts: string[] = [];

  // Tech
  if (promise.tech) {
    parts.push(`tech: ${promise.tech}`);
  }

  // Equipment
  if (promise.equip) {
    parts.push(`equip: ${promise.equip}`);
  }

  // Condition
  if (promise.condition) {
    parts.push(`condition: ${promise.condition}`);
  }

  // Granular/Liquid
  if (promise.granLiq) {
    parts.push(`granLiq: ${promise.granLiq}`);
  }

  // Date Target (use date, dateScope, targetPeriod - ignore dateRange)
  if (promise.dateTarget) {
    const { dateScope, date } = promise.dateTarget;

    if (
      dateScope === DateScope.before ||
      dateScope === DateScope.after ||
      dateScope === DateScope.onDate
    ) {
      if (date) {
        parts.push(`${dateScope}: ${date}`);
      }
    } else if (dateScope === DateScope.weekOf || dateScope === DateScope.monthOf) {
      const { targetPeriod } = promise.dateTarget;
      if (date && targetPeriod) {
        parts.push(`${targetPeriod} ${dateScope}: ${date}`);
      }
    }
  }

  // Time of Day
  if (promise.timeOfDay) {
    // Handle string fallback
    if (typeof promise.timeOfDay === "string") {
      parts.push(promise.timeOfDay);
    } else {
      const { timeFrame } = promise.timeOfDay;

      if (
        timeFrame === TimeFrame.at ||
        timeFrame === TimeFrame.before ||
        timeFrame === TimeFrame.after
      ) {
        const { time } = promise.timeOfDay;
        if (time) {
          parts.push(`${timeFrame}: ${time}`);
        }
      } else if (timeFrame === TimeFrame.between) {
        const { start, end } = promise.timeOfDay;
        if (start && end) {
          parts.push(`${timeFrame}: ${start} and ${end}`);
        }
      } else if (timeFrame === TimeFrame.first || timeFrame === TimeFrame.last) {
        parts.push(`${timeFrame}`);
      }
    }
  }

  // Days of Week
  if (promise.daysOfWeek?.length) {
    const sortedDays: DayOfWeek[] = [];
    Object.values(DayOfWeek).forEach((day) => {
      if (promise.daysOfWeek?.includes(day)) {
        sortedDays.push(day);
      }
    });
    parts.push(`OK Days: ${sortedDays.join("_")}`);
  }

  // Other
  if (promise.other) {
    parts.push(promise.other);
  }

  return `p${wrappers[0]}${parts.join(", ")}${wrappers[1]}`;
}

/**
 * Parses a tech note string to extract and validate promise notation
 * @param techNote - Full CRM tech note (may contain non-promise text)
 * @returns ParseResult: null (no promise found), validation issue, or promise with issues array
 * @example
 * parsePromiseString("Customer requested p[tech: John, before: 12/25] for service")
 * => { promise: {...}, issues: [] }
 */
export function parsePromiseString(techNote: string): ParseResult {
  // Extract promise pattern from tech note
  const promiseMatch = techNote.match(/p[\[{][^\]}]*[\]}]/);
  if (!promiseMatch) return null;

  const promiseString = promiseMatch[0];
  const issues: string[] = [];

  // Determine if permanent or seasonal based on brackets
  let isPermanent: "true" | "false";
  if (promiseString.startsWith("p[") && promiseString.endsWith("]")) {
    isPermanent = "true";
  } else if (promiseString.startsWith("p{") && promiseString.endsWith("}")) {
    isPermanent = "false";
  } else {
    return createValidationIssue("Invalid promise string format", promiseString);
  }

  // Extract content between wrappers
  const content = promiseString.slice(2, -1).trim();

  // Check for empty content
  if (content.length === 0) {
    return createValidationIssue("Empty promise content", promiseString);
  }

  const promise: SchedPromiseDraft = { isPermanent };

  // Split by comma, respecting nested content
  const parts = splitPromiseParts(content);

  for (const part of parts) {
    const colonIndex = part.indexOf(":");

    // Handle parts without colon
    if (colonIndex === -1) {
      const trimmed = part.trim();

      // Check for time frames without values
      if (isTimeFrameKey(trimmed)) {
        if (trimmed === TimeFrame.first || trimmed === TimeFrame.last) {
          promise.timeOfDay = { timeFrame: trimmed };
        } else {
          issues.push(`Time frame "${trimmed}" requires a time value`);
        }
      }
      // Otherwise treat as "other"
      else {
        promise.other = trimmed;
      }
      continue;
    }

    const key = part.slice(0, colonIndex).trim();
    const value = part.slice(colonIndex + 1).trim();

    // Parse based on key
    if (key === "tech") {
      promise.tech = value;
    } else if (key === "equip") {
      promise.equip = value;
    } else if (key === "condition") {
      // Accept any string, prefer enum values
      promise.condition = value;
    } else if (key === "granLiq") {
      const parsed = parseGranLiq(value);
      if (parsed) {
        promise.granLiq = parsed;
      } else {
        issues.push(`Invalid granLiq value: "${value}"`);
      }
    } else if (isDateScopeKey(key)) {
      // Simple date scopes: before, after, onDate
      const isoDate = dateParser.tryParseDate(value);
      if (!isoDate) {
        issues.push(`Invalid date format: "${value}" for ${key}`);
        continue;
      }

      const dateRange = parseDateRange(key, value);
      if (!dateRange) {
        issues.push(`Could not calculate date range for ${key}: ${value}`);
        continue;
      }

      // TypeScript needs explicit discrimination for DateTarget union
      if (key === DateScope.before || key === DateScope.after) {
        promise.dateTarget = {
          dateScope: key,
          date: isoDate,
          dateRange,
        };
      } else if (key === DateScope.onDate) {
        promise.dateTarget = {
          dateScope: key,
          date: isoDate,
          dateRange,
        };
      }
    } else if (key.includes(DateScope.weekOf) || key.includes(DateScope.monthOf)) {
      // Handle "early week of: 12/25" or "mid month of: 01/15"
      const targetPeriodMatch = key.match(/^(early|mid|late|any day)\s+(week of|month of)$/);
      if (targetPeriodMatch) {
        const targetPeriod = targetPeriodMatch[1] as TargetPeriod;
        const dateScope = targetPeriodMatch[2] as DateScope.weekOf | DateScope.monthOf;

        const isoDate = dateParser.tryParseDate(value);
        if (!isoDate) {
          issues.push(`Invalid date format: "${value}" for ${key}`);
          continue;
        }

        const dateRange = parseDateRange(dateScope, value, targetPeriod);
        if (!dateRange) {
          issues.push(`Could not calculate date range for ${key}: ${value}`);
          continue;
        }

        promise.dateTarget = {
          dateScope,
          targetPeriod,
          date: isoDate,
          dateRange,
        };
      } else {
        issues.push(`Invalid date target format: "${key}"`);
      }
    } else if (isTimeFrameKey(key)) {
      // Simple time frames: at, before, after
      if (key === TimeFrame.at || key === TimeFrame.before || key === TimeFrame.after) {
        promise.timeOfDay = {
          timeFrame: key,
          time: value,
        };
      } else if (key === TimeFrame.between) {
        // Parse "8:00 AM and 12:00 PM"
        const andIndex = value.indexOf(" and ");
        if (andIndex !== -1) {
          promise.timeOfDay = {
            timeFrame: TimeFrame.between,
            start: value.slice(0, andIndex).trim(),
            end: value.slice(andIndex + 5).trim(),
          };
        } else {
          issues.push(`Invalid between format: "${value}" (expected "X and Y")`);
        }
      }
    } else if (key === "OK Days") {
      const parsed = parseDaysOfWeek(value);
      if (parsed.length > 0) {
        promise.daysOfWeek = parsed;
      } else {
        issues.push(`Invalid days of week format: "${value}"`);
      }
    } else {
      // Unknown key
      issues.push(`Unknown promise field: "${key}"`);
    }
  }

  return { promise, issues };
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

/**
 * Type guard for DateScope enum values
 */
function isDateScopeKey(key: string): key is DateScope {
  return Object.values(DateScope).includes(key as DateScope);
}

/**
 * Type guard for TimeFrame enum values
 */
function isTimeFrameKey(key: string): key is TimeFrame {
  return Object.values(TimeFrame).includes(key as TimeFrame);
}

/**
 * Parses granLiq value with flexible matching
 * Accepts: gran, granular, liq, liquid (case-insensitive)
 */
function parseGranLiq(value: string): GranLiq | null {
  const normalized = value.toLowerCase().trim();

  if (/^gran(ular)?(\s+only)?$/i.test(normalized)) {
    return GranLiq.gran;
  }
  if (/^liq(uid)?(\s+only)?$/i.test(normalized)) {
    return GranLiq.liquid;
  }
  if (/^hose\s+or\s+push(\s+spreader)?(\s+only)?$/i.test(normalized)) {
    return GranLiq.hoseOrPush;
  }

  return null;
}

/**
 * Parses days of week from string
 * Accepts: "Mon_Tue_Wed" or "MTWRF" or "Odd" or "Even"
 */
function parseDaysOfWeek(value: string): DayOfWeek[] {
  const trimmed = value.trim();

  // Check for Odd/Even
  if (trimmed.toLowerCase() === "odd") return [DayOfWeek.Odd];
  if (trimmed.toLowerCase() === "even") return [DayOfWeek.Even];

  // Check for underscore-delimited format
  if (trimmed.includes("_")) {
    const days = trimmed.split("_").map((d) => d.trim());
    return days.filter((day) =>
      Object.values(DayOfWeek).includes(day as DayOfWeek),
    ) as DayOfWeek[];
  }

  // Check for compact format (MTWRF)
  const compactMap: Record<string, DayOfWeek> = {
    M: DayOfWeek.Mon,
    T: DayOfWeek.Tue,
    W: DayOfWeek.Wed,
    R: DayOfWeek.Thr,
    F: DayOfWeek.Fri,
  };

  if (/^[MTWRF]+$/i.test(trimmed)) {
    const days: DayOfWeek[] = [];
    for (const char of trimmed.toUpperCase()) {
      const day = compactMap[char];
      if (day && !days.includes(day)) {
        days.push(day);
      }
    }
    return days;
  }

  return [];
}

/**
 * Helper to create validation issue object
 */
function createValidationIssue(issue: string, rawString: string): PromiseValidationIssue {
  return {
    type: "validation_issue",
    issue,
    rawString,
  };
}
