import {
  SchedPromise,
  ParseResult,
  ParsedDate,
  ParsedTime,
  ParsedTimeSimple,
  ParsedTimeBetween,
  ParsedDays,
  DateScope,
  DatePeriod,
  DAY_CHARS,
  DayChar,
} from "@/app/schedPromise/SchedPromiseTypes";
import { dateParser } from "@/lib/primatives/dates/dateParse";
import { timeParser } from "@/lib/primatives/dates/timeParse";
import { parseDateRange } from "@/app/schedPromise/dateRangeParse";
import { parseTimeRange, parseBetweenTimeRange } from "@/app/schedPromise/timeRangeParse";

// ============================================================================
// PARSING
//
// Format: p[key: value, key: value, ...]  or  p{...}
//
// Rules:
//   - Split content by commas
//   - First colon in each part splits key from value
//   - No colon → key = "note", value = full text
//   - Strict keys: date, time, days — parse failures recorded in issues
//   - Loose keys: tech, equip, condition, granLiq, note — stored as raw strings
//   - Unknown keys → unknownFields
// ============================================================================

// ============================================================================
// DATE PARSING
// ============================================================================

const DATE_SCOPES: DateScope[] = ["before", "after", "on", "week of", "month of"];
const DATE_PERIODS: DatePeriod[] = ["early", "mid", "late", "any day"];

function parseDateValue(raw: string): { parsed: ParsedDate | null; issue: string | null } {
  const text = raw.trim().toLowerCase();

  // Check for period prefix (early/mid/late/any day) before scope
  let period: DatePeriod | undefined;
  let remaining = text;

  for (const p of DATE_PERIODS) {
    if (text.startsWith(p + " ")) {
      period = p;
      remaining = text.slice(p.length + 1).trim();
      break;
    }
  }

  // Find scope keyword
  let scope: DateScope | undefined;
  let dateStr: string | undefined;

  for (const s of DATE_SCOPES) {
    if (remaining.startsWith(s + " ")) {
      scope = s;
      dateStr = remaining.slice(s.length + 1).trim();
      break;
    }
    // Exact match (e.g. just "on 12/25" where scope is "on")
    if (remaining === s) {
      scope = s;
      dateStr = "";
      break;
    }
  }

  if (!scope || !dateStr) {
    return {
      parsed: null,
      issue: `date: could not identify scope in "${raw}". Expected: before/after/on/[period] week of/[period] month of`,
    };
  }

  // Period only valid for week of / month of
  if (period && scope !== "week of" && scope !== "month of") {
    return {
      parsed: null,
      issue: `date: period "${period}" is only valid with "week of" or "month of", not "${scope}"`,
    };
  }

  // Default period for week of / month of
  const resolvedPeriod: DatePeriod | undefined =
    scope === "week of" || scope === "month of" ? (period ?? "any day") : undefined;

  const isoDate = dateParser.tryParseDate(dateStr);
  if (!isoDate) {
    return {
      parsed: null,
      issue: `date: could not parse date "${dateStr}"`,
    };
  }

  const dateRange = parseDateRange(scope, dateStr, resolvedPeriod);
  if (!dateRange) {
    return {
      parsed: null,
      issue: `date: could not compute date range for "${raw}"`,
    };
  }

  return {
    parsed: {
      scope,
      ...(resolvedPeriod !== undefined ? { period: resolvedPeriod } : {}),
      date: isoDate,
      dateRange,
    },
    issue: null,
  };
}

// ============================================================================
// TIME PARSING
// ============================================================================

function parseTimeValue(raw: string): { parsed: ParsedTime | null; issue: string | null } {
  const text = raw.trim();
  const lower = text.toLowerCase();

  // First Stop / Last Stop (case-insensitive)
  if (lower === "first stop") return { parsed: { scope: "First Stop" }, issue: null };
  if (lower === "last stop") return { parsed: { scope: "Last Stop" }, issue: null };

  // between <start> and <end>
  if (lower.startsWith("between ")) {
    const inner = text.slice("between ".length).trim();
    const andIdx = inner.toLowerCase().indexOf(" and ");
    if (andIdx === -1) {
      return {
        parsed: null,
        issue: `time: "between" requires "and" separator, got "${raw}"`,
      };
    }
    const startStr = inner.slice(0, andIdx).trim();
    const endStr = inner.slice(andIdx + 5).trim();
    const timeRange = parseBetweenTimeRange(startStr, endStr);
    if (!timeRange) {
      return {
        parsed: null,
        issue: `time: could not parse times in "between ${startStr} and ${endStr}"`,
      };
    }
    return {
      parsed: { scope: "between", start: startStr, end: endStr, timeRange },
      issue: null,
    };
  }

  // at/before/after <time>
  for (const scope of ["at", "before", "after"] as const) {
    if (lower.startsWith(scope + " ")) {
      const timeStr = text.slice(scope.length + 1).trim();
      const timeRange = parseTimeRange(scope, timeStr);
      if (!timeRange) {
        return {
          parsed: null,
          issue: `time: could not parse time "${timeStr}" for scope "${scope}"`,
        };
      }
      return {
        parsed: { scope, time: timeStr, timeRange },
        issue: null,
      };
    }
  }

  return {
    parsed: null,
    issue: `time: unrecognized format "${raw}". Expected: at/before/after <time>, between <time> and <time>, First Stop, Last Stop`,
  };
}

// ============================================================================
// DAYS PARSING
// ============================================================================

function parseDaysValue(raw: string): { parsed: ParsedDays | null; issue: string | null } {
  const text = raw.trim();
  const lower = text.toLowerCase();

  if (lower === "odd") return { parsed: { kind: "special", special: "Odd" }, issue: null };
  if (lower === "even") return { parsed: { kind: "special", special: "Even" }, issue: null };

  const upper = text.toUpperCase();
  const validSet = new Set<string>(DAY_CHARS);
  const chars: DayChar[] = [];
  const invalid: string[] = [];

  for (const ch of upper) {
    if (validSet.has(ch)) {
      if (!chars.includes(ch as DayChar)) {
        chars.push(ch as DayChar);
      }
    } else {
      invalid.push(ch);
    }
  }

  if (invalid.length > 0) {
    return {
      parsed: null,
      issue: `days: unrecognized characters "${invalid.join("")}" in "${raw}". Valid: M T W R F, Odd, Even`,
    };
  }

  if (chars.length === 0) {
    return {
      parsed: null,
      issue: `days: no valid day characters found in "${raw}"`,
    };
  }

  // Canonical order: MTWRF
  const ordered = DAY_CHARS.filter((c) => chars.includes(c));
  const compact = ordered.join("");

  return { parsed: { kind: "days", compact, chars: ordered }, issue: null };
}

// ============================================================================
// STRINGIFY
// ============================================================================

/**
 * Converts a SchedPromise back to the compact promise string notation.
 * Only includes fields that are present and non-null.
 */
export function stringifyPromise(promise: SchedPromise): string {
  const parts: string[] = [];

  if (promise.date) {
    const { scope, period, date } = promise.date;
    const periodStr = period && period !== "any day" ? `${period} ` : "";
    parts.push(`date: ${periodStr}${scope} ${date}`);
  }

  if (promise.time) {
    const t = promise.time;
    if (t.scope === "First Stop" || t.scope === "Last Stop") {
      parts.push(`time: ${t.scope}`);
    } else if (t.scope === "between") {
      parts.push(`time: between ${t.start} and ${t.end}`);
    } else if (t.scope === "at" || t.scope === "before" || t.scope === "after") {
      parts.push(`time: ${t.scope} ${t.time}`);
    }
  }

  if (promise.days) {
    const d = promise.days;
    parts.push(`days: ${d.kind === "special" ? d.special : d.compact}`);
  }

  if (promise.tech) parts.push(`tech: ${promise.tech}`);
  if (promise.equip) parts.push(`equip: ${promise.equip}`);
  if (promise.condition) parts.push(`condition: ${promise.condition}`);
  if (promise.granLiq) parts.push(`granLiq: ${promise.granLiq}`);
  if (promise.note) parts.push(`note: ${promise.note}`);

  if (promise.unknownFields) {
    for (const [key, value] of Object.entries(promise.unknownFields)) {
      parts.push(`${key}: ${value}`);
    }
  }

  const wrap = promise.isPermanent ? ["[", "]"] : ["{", "}"];
  return `p${wrap[0]}${parts.join(", ")}${wrap[1]}`;
}

// ============================================================================
// MAIN PARSE FUNCTION
// ============================================================================

/**
 * Parses a tech note string to extract promise notation.
 *
 * Returns:
 *   - promise: null if no p[...] or p{...} pattern found; otherwise a SchedPromise
 *     (even if some strict fields failed to parse — those will be null with issues recorded)
 *   - issues: array of parse failure messages for strict fields
 */
export function parsePromiseString(params: {
  techNote: string;
  entityType?: "service" | "program" | "customer";
  entityId?: number;
}): ParseResult {
  const { techNote } = params;
  const issues: string[] = [];

  // Extract promise pattern
  const match = techNote.match(/p([\[{])([^\]}]*)([\]}])/);
  if (!match) return { promise: null, issues: [] };

  const openBracket = match[1];
  const content = match[2].trim();
  const closeBracket = match[3];

  // Validate bracket pairing
  const isPermanent =
    (openBracket === "[" && closeBracket === "]") ||
    (openBracket === "{" && closeBracket === "}");

  if (!isPermanent && openBracket === "[") {
    issues.push(`Mismatched brackets: p[ must close with ]`);
    return { promise: null, issues };
  }
  if (openBracket === "{" && closeBracket !== "}") {
    issues.push(`Mismatched brackets: p{ must close with }`);
    return { promise: null, issues };
  }

  const permanent = openBracket === "[";

  const promise: SchedPromise = { isPermanent: permanent };

  if (!content) return { promise, issues };

  // Split by commas
  const parts = splitParts(content);

  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    let key: string;
    let value: string;

    if (colonIdx === -1) {
      key = "note";
      value = part.trim();
    } else {
      key = part.slice(0, colonIdx).trim().toLowerCase();
      value = part.slice(colonIdx + 1).trim();
    }

    switch (key) {
      case "date": {
        const { parsed, issue } = parseDateValue(value);
        promise.date = parsed;
        if (issue) issues.push(issue);
        break;
      }
      case "time": {
        const { parsed, issue } = parseTimeValue(value);
        promise.time = parsed;
        if (issue) issues.push(issue);
        break;
      }
      case "days": {
        const { parsed, issue } = parseDaysValue(value);
        promise.days = parsed;
        if (issue) issues.push(issue);
        break;
      }
      case "tech":
        promise.tech = value;
        break;
      case "equip":
        promise.equip = value;
        break;
      case "condition":
        promise.condition = value;
        break;
      case "granliq":
        promise.granLiq = value;
        break;
      case "note":
        promise.note = value;
        break;
      default:
        promise.unknownFields = { ...promise.unknownFields, [key]: value };
        break;
    }
  }

  return { promise, issues };
}

// ============================================================================
// HELPERS
// ============================================================================

/** Splits promise content by commas (simple — no nesting in this format). */
function splitParts(content: string): string[] {
  return content
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}
