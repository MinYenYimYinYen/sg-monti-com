import { parse, isValid, format } from "date-fns";

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

// Parses a string in "MMDDYYYY" format
function parseMMDDYYYY(dateString: string): Date | undefined {
  if (["/", "-"].some((char) => dateString.includes(char))) return undefined;
  if (!(dateString.length === 8)) return undefined;
  const parsedDate = parse(dateString, "MMddyyyy", new Date());
  return isValid(parsedDate) ? parsedDate : undefined; // Return undefined if invalid
}

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

// Tries to parse a date string using a series of parsers
function tryParseDate(dateString: string): string | undefined {
  const normalized = preprocessDateInput(dateString);
  const dateParsers = [
    parseMMDDYY,
    parseMMDDYYYY,
    parseMMDD, // Added here for 4-character inputs
    parseYYYY_MM_DD,
    parseMM_DD_YYYY,
  ];

  for (const parseFn of dateParsers) {
    const date = parseFn(normalized);
    if (date) {
      return format(date, "yyyy-MM-dd"); // Standardize output to ISO format
    }
  }

  return undefined; // Return undefined if no parsers succeed
}

export const dateParser = {
  tryParseDate,
};
