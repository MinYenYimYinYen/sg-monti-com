import {
  parse,
  isValid,
  format,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfDay,
  getDay,
} from "date-fns";

// Entry Point: Tries to parse a date string using optimized routing
function tryParseDate(dateString: string): string | undefined {
  const text = dateString.trim();
  if (!text) return undefined;

  // 1. Semantic Route: If it has letters, it must be semantic (e.g., "today", "5d")
  if (/[a-z]/i.test(text)) {
    const semanticDate = parseSemantic(text);
    return semanticDate ? format(semanticDate, "yyyy-MM-dd") : undefined;
  }

  // 2. Numeric Route
  const normalized = preprocessDateInput(text);
  const hasSeparator = normalized.includes("/") || normalized.includes("-");

  // Optimize: Only try relevant parsers based on structure
  const parsers = hasSeparator
    ? [parseYYYY_MM_DD, parseMM_DD_YYYY]
    : [parseMMDDYY, parseMMDDYYYY, parseMMDD];

  for (const parseFn of parsers) {
    const date = parseFn(normalized);
    if (date) return format(date, "yyyy-MM-dd");
  }

  return undefined;
}

// Semantic Parser for natural language dates (e.g., "today", "next friday", "2w")
function parseSemantic(dateString: string): Date | undefined {
  const text = dateString.toLowerCase();
  const today = startOfDay(new Date());

  // 1. Keywords
  if (["today", "tod"].includes(text)) return today;
  if (["tomorrow", "tom"].includes(text)) return addDays(today, 1);
  if (["yesterday", "yes"].includes(text)) return addDays(today, -1);

  // 2. Relative time (e.g. "in 5 days", "5d", "5 days", "2w", "1m", "1y")
  const relativeMatch = text.match(
    /^(?:in\s+)?(\d+)\s*(d|w|m|y|days?|weeks?|months?|years?)$/
  );
  if (relativeMatch) {
    const num = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];
    if (unit.startsWith("d")) return addDays(today, num);
    if (unit.startsWith("w")) return addWeeks(today, num);
    if (unit.startsWith("m")) return addMonths(today, num);
    if (unit.startsWith("y")) return addYears(today, num);
  }

  // 3. Next Units
  if (text === "next week") return addWeeks(today, 1);
  if (text === "next month") return addMonths(today, 1);
  if (text === "next year") return addYears(today, 1);

  // 4. Weekdays
  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const shorts = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  const isNext = text.startsWith("next ");
  const dayText = isNext ? text.replace("next ", "") : text;

  let dayIndex = weekdays.indexOf(dayText);
  if (dayIndex === -1) dayIndex = shorts.indexOf(dayText);

  if (dayIndex !== -1) {
    const currentDay = getDay(today);
    let diff = dayIndex - currentDay;
    if (diff < 0) diff += 7; // Move to future

    // If "next [day]", add 7 days to skip the immediate occurrence
    if (isNext) {
      return addDays(today, diff + 7);
    }
    return addDays(today, diff);
  }

  return undefined;
}

// Preprocess date strings like "1/1/01" or "1-1-2001" or just "1/1" => 2025-01-01
function preprocessDateInput(dateString: string): string {
  const delimiter =
    ["/", "-"].find((char) => dateString.includes(char)) || null;

  if (!delimiter) return dateString; // No delimiters, return as-is

  // Split the input into parts (month, day, year)
  const parts = dateString.split(delimiter);

  // If the input is already complete (YYYY-MM-DD or YYYY/MM/DD), return it as-is
  if (parts.length === 3 && parts[0].length === 4) {
    return dateString; // Assume it's valid and normalize later
  }

  // Add leading zeroes to month and day
  const month = parts[0]?.padStart(2, "0") || "01"; // Default month to "01" if missing
  const day = parts[1]?.padStart(2, "0") || "01"; // Default day to "01" if missing
  const currentYear = new Date().getFullYear();

  // Handle the year part
  const year =
    parts[2]?.length === 2
      ? `20${parts[2]}`
      : parts[2] || currentYear.toString(); // Handle year

  // Recombine using the delimiter
  return [month, day, year].join(delimiter);
}

// --- Separator Parsers ---

// Parses a string in "YYYY-MM-DD" or "YYYY/MM/DD" format
function parseYYYY_MM_DD(dateString: string): Date | undefined {
  if (!(dateString.length === 10)) return undefined;
  const standardizedInput = dateString.replace(/\//g, "-"); // Replace "/" with "-"
  const parsedDate = parse(standardizedInput, "yyyy-MM-dd", new Date());
  return isValid(parsedDate) ? parsedDate : undefined; // Return undefined if invalid
}

// Parses a string in "MM/DD/YYYY" or "MM-DD-YYYY" format
function parseMM_DD_YYYY(dateString: string): Date | undefined {
  if (!(dateString.length === 10)) return undefined;
  const standardizedInput = dateString.replace(/-/g, "/"); // Replace "-" with "/"
  const parsedDate = parse(standardizedInput, "MM/dd/yyyy", new Date());
  return isValid(parsedDate) ? parsedDate : undefined; // Return undefined if invalid
}

// --- Compact Parsers (No Separators) ---

// Parses a string in "MMDDYY" format, assuming this century
function parseMMDDYY(dateString: string): Date | undefined {
  if (["/", "-"].some((char) => dateString.includes(char))) return undefined;
  if (!(dateString.length === 6)) return undefined;
  const parsedDate = parse(dateString, "MMddyy", new Date());
  if (!isValid(parsedDate)) return undefined; // Return undefined if invalid

  // Always assume this century for 2-digit years
  const year = parsedDate.getFullYear();
  const currentYear = new Date().getFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;
  parsedDate.setFullYear(currentCentury + (year % 100)); // Force to current century

  return parsedDate;
}

// Parses a string in "MMDDYYYY" format
function parseMMDDYYYY(dateString: string): Date | undefined {
  if (["/", "-"].some((char) => dateString.includes(char))) return undefined;
  if (!(dateString.length === 8)) return undefined;
  const parsedDate = parse(dateString, "MMddyyyy", new Date());
  return isValid(parsedDate) ? parsedDate : undefined; // Return undefined if invalid
}

// Parses a string in "MMDD" format, assuming the current year
function parseMMDD(dateString: string): Date | undefined {
  if (["/", "-"].some((char) => dateString.includes(char))) return undefined;
  if (!(dateString.length === 4)) return undefined;

  const currentYear = new Date().getFullYear();
  // Add the current year to form a full "MMDDYYYY" string
  const fullDateString = `${dateString}${currentYear}`;
  const parsedDate = parse(fullDateString, "MMddyyyy", new Date());
  return isValid(parsedDate) ? parsedDate : undefined; // Return undefined if invalid
}

export const dateParser = {
  tryParseDate,
};
