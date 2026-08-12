import { z } from "zod";
import { ParseConfig } from "@/app/csv/_lib/ParserTypes";
import { createCSVParser } from "@/app/csv/_lib/parserFactory";
import { CsvPunchRow, Punch, groupPunchRows } from "@/app/timeCard/TimeCardTypes";

/**
 * Parses a 12-hour time string (e.g. "06:32 AM") to 24-hour "HH:mm:00".
 * Returns an empty string if the input cannot be parsed.
 */
function parse12hTo24h(timeStr: string): string {
  const trimmed = timeStr.trim();
  // Expected format: "hh:mm AM" or "hh:mm PM"
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "";

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const meridiem = match[3].toUpperCase();

  if (meridiem === "AM") {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}:00`;
}

/**
 * Parses "MM/DD/YYYY HH:MM:SS" (RealGreen ReportDate format) to "yyyy-MM-dd".
 * Returns an empty string if the input cannot be parsed.
 */
function parseReportDate(raw: string): string {
  // "08/10/2026 00:00:00" → take only the date portion
  const datePart = raw.trim().split(" ")[0];
  if (!datePart) return "";

  const parts = datePart.split("/");
  if (parts.length !== 3) return "";

  const [month, day, year] = parts;
  if (!month || !day || !year) return "";

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const CsvPunchRowSchema = z.object({
  punchId: z.number().int().positive("punchId must be a positive integer"),
  employeeId: z.string().min(1, "employeeId cannot be empty"),
  punchDate: z.string().min(1, "punchDate cannot be empty"),
  // Empty string is allowed — rows with missing clock-in/out are flagged as
  // blocked suspects on the front end and excluded from import by default.
  inTime: z.string(),
  outTime: z.string(),
});

/**
 * InOutTimeFormatted contains both inTime and outTime in a single column,
 * separated by " / " (e.g. "06:32 AM / 03:36 PM"). Because createCSVParser
 * maps one column to one field, we map InOutTimeFormatted to a temporary
 * string field and split it in the transformation. The transformation writes
 * both inTime and outTime onto the result object directly.
 *
 * The schema validates the final CsvPunchRow shape after transformation.
 */
const PUNCH_PARSE_CONFIG: ParseConfig<CsvPunchRow> = {
  columnMappings: {
    TimeHeadId: "punchId",
    EmployeeId: "employeeId",
    ReportDate: "punchDate",
    // InOutTimeFormatted maps to inTime as a placeholder; the transformation
    // below splits the value and sets both inTime and outTime on the result.
    InOutTimeFormatted: "inTime",
  },
  requiredColumns: ["TimeHeadId", "EmployeeId", "ReportDate", "InOutTimeFormatted"],
  optionalColumns: [],
  transformations: {
    TimeHeadId: (val) => parseInt(val.trim(), 10),
    EmployeeId: (val) => val.trim(),
    ReportDate: (val) => parseReportDate(val),
    // Split "HH:MM AM / HH:MM PM" into inTime and outTime.
    // The factory assigns the return value to the mapped field ("inTime"),
    // but we need to also set outTime. We accomplish this by returning a
    // special object that the schema will reject unless we handle it — instead,
    // we use a post-transform via advisoryChecks to patch outTime.
    //
    // Simpler approach: return the full split result as a JSON string and
    // decode it in advisoryChecks. But the cleanest solution given the
    // factory's one-column-one-field constraint is to encode both times
    // into the inTime field as "inTime|outTime" and decode in advisoryChecks.
    InOutTimeFormatted: (val) => {
      const parts = val.split(" / ");
      const inTime = parse12hTo24h(parts[0] ?? "");
      const outTime = parse12hTo24h(parts[1] ?? "");
      // Encode both as "inTime|outTime" — decoded in advisoryChecks below
      return `${inTime}|${outTime}`;
    },
  },
  schema: z.preprocess(
    (raw) => {
      // Decode the encoded "inTime|outTime" value before Zod validation
      const obj = raw as Record<string, unknown>;
      const encoded = obj.inTime as string | undefined;
      if (encoded && encoded.includes("|")) {
        const [inTime, outTime] = encoded.split("|");
        return { ...obj, inTime, outTime };
      }
      return obj;
    },
    CsvPunchRowSchema,
  ) as z.ZodSchema<CsvPunchRow>,
};

const parseCsvRows = createCSVParser<CsvPunchRow>(PUNCH_PARSE_CONFIG);

/**
 * Parses a RealGreen time card CSV into Punch[] (one record per employee per day).
 * Multiple CSV rows sharing the same TimeHeadId (split shifts, missed punches)
 * are grouped into a single Punch with multiple segments via groupPunchRows().
 */
export async function parsePunches(file: File): Promise<
  | { success: true; data: Punch[]; warnings?: string[] }
  | { success: false; errors: string[]; partialData?: Punch[] }
> {
  const result = await parseCsvRows(file);

  if (!result.success) {
    return {
      success: false,
      errors: result.errors,
      partialData: result.partialData ? groupPunchRows(result.partialData) : undefined,
    };
  }

  return {
    success: true,
    data: groupPunchRows(result.data),
    warnings: result.warnings,
  };
}
