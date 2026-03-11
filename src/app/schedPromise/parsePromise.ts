import {
  DateScope,
  DayOfWeek,
  SchedPromiseDraft,
  TargetPeriod,
  TimeFrame,
} from "@/app/schedPromise/SchedPromiseTypes";

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

  // Date Target
  if (promise.dateTarget) {
    const { dateScope } = promise.dateTarget;

    if (
      dateScope === DateScope.before ||
      dateScope === DateScope.after ||
      dateScope === DateScope.onDate
    ) {
      const { date } = promise.dateTarget;
      if (date) {
        parts.push(`${dateScope}: ${date}`);
      }
    } else if (
      dateScope === DateScope.weekOf ||
      dateScope === DateScope.monthOf
    ) {
      const { date, targetPeriod } = promise.dateTarget;
      if (date && targetPeriod) {
        parts.push(`${targetPeriod} ${dateScope}: ${date}`);
      }
    } else if (dateScope === DateScope.odd || dateScope === DateScope.even) {
      parts.push(`${dateScope}`);
    }
  }

  // Time of Day
  if (promise.timeOfDay) {
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
 * Parses a compact promise string notation into a SchedPromiseDraft object
 * @example parsePromiseString("p[tech: John, before: 12/25]") => {isPermanent: "true", tech: "John", ...}
 */
export function parsePromiseString(promiseString: string): SchedPromiseDraft {
  const promise: SchedPromiseDraft = {
    isPermanent: "",
  };

  // Determine if permanent or season-only based on brackets
  if (promiseString.startsWith("p[") && promiseString.endsWith("]")) {
    promise.isPermanent = "true";
  } else if (promiseString.startsWith("p{") && promiseString.endsWith("}")) {
    promise.isPermanent = "false";
  } else {
    throw new Error(`Invalid promise string format: ${promiseString}`);
  }

  // Extract content between wrappers
  const content = promiseString.slice(2, -1);

  // Split by comma, but be careful with nested content (e.g., "between: 8:00 AM and 12:00 PM")
  const parts = splitPromiseParts(content);

  for (const part of parts) {
    const colonIndex = part.indexOf(":");

    // Handle parts without colon (e.g., "First Stop", "even days", "odd days")
    if (colonIndex === -1) {
      const trimmed = part.trim();

      // Check for time frames without values
      if (trimmed === TimeFrame.first || trimmed === TimeFrame.last) {
        promise.timeOfDay = { timeFrame: trimmed };
      }
      // Check for date scopes without values
      else if (trimmed === DateScope.even || trimmed === DateScope.odd) {
        promise.dateTarget = { dateScope: trimmed };
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
      promise.condition = value as any;
    } else if (key === "granLiq") {
      promise.granLiq = value as any;
    } else if (key === DateScope.before || key === DateScope.after || key === DateScope.onDate) {
      promise.dateTarget = {
        dateScope: key,
        date: value,
      };
    } else if (key.includes(DateScope.weekOf) || key.includes(DateScope.monthOf)) {
      // Handle "early week of: 12/25" or "mid month of: 01/15"
      const targetPeriodMatch = key.match(/^(early|mid|late|any day)\s+(week of|month of)$/);
      if (targetPeriodMatch) {
        promise.dateTarget = {
          dateScope: targetPeriodMatch[2] as DateScope.weekOf | DateScope.monthOf,
          targetPeriod: targetPeriodMatch[1] as TargetPeriod,
          date: value,
        };
      }
    } else if (key === TimeFrame.at || key === TimeFrame.before || key === TimeFrame.after) {
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
      }
    } else if (key === "OK Days") {
      promise.daysOfWeek = value.split("_") as DayOfWeek[];
    } else {
      // Unknown key, treat as other
      promise.other = part;
    }
  }

  return promise;
}

/**
 * Splits promise string content by commas, respecting nested content
 * @example "tech: John, between: 8:00 AM and 12:00 PM, other" => ["tech: John", "between: 8:00 AM and 12:00 PM", "other"]
 */
function splitPromiseParts(content: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts.map(p => p.trim()).filter(p => p.length > 0);
}