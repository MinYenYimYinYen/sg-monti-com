import { z } from "zod";
import { dateParser } from "@/lib/primatives/dates/dateParse";
import { ParseConfig } from "./ParserTypes";
import { createCSVParser } from "@/app/csv/_lib/parserFactory";
import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";

const ServiceUnservicedSchema = z.object({
  servId: z.number().positive("Service ID must be a positive number"),
  employeeId: z.string().min(1, "Employee ID cannot be empty"),
  schedDate: z.string().min(1, "Scheduled date cannot be empty"),
  status: z.string().min(1, "Status cannot be empty"),
  sequence: z.number().nonnegative("Sequence must be a non-negative number"),
});

const UNSERVICED_PARSE_CONFIG: ParseConfig<AssignmentDoc> = {
  columnMappings: {
    ServiceId: "servId",
    AssignedToEmployeeId: "employeeId",
    ScheduledDateAsDate: "schedDate",
    ServiceStatus: "status",
    Sequence: "sequence",
  },
  requiredColumns: [
    "ServiceId",
    "AssignedToEmployeeId",
    "ScheduledDateAsDate",
    "ServiceStatus",
    "Sequence",
  ],
  optionalColumns: [],
  transformations: {
    ServiceId: (val) => parseInt(val, 10),
    AssignedToEmployeeId: (val) => val.trim(),

    ScheduledDateAsDate: (val) =>
      dateParser.tryParseDate(val.split(" ")[0]) ?? "",

    ServiceStatus: (val) => val.trim(),

    // RealGreen stores sequence multiplied by 10; divide to normalize.
    Sequence: (val) => parseInt(val, 10) / 10,
  },
  schema: ServiceUnservicedSchema,
  // Sequence of 0 is technically valid after normalization (RealGreen sends 0 for unsequenced rows).
  // Warn the user so they can verify the source data, but still load the row.
  advisoryChecks: (row) =>
    row.sequence === 0
      ? [
          `Service ${row.employeeId}-${row.schedDate}-${row.servId}: Sequence is 0 — row will be included but verify source data`,
        ]
      : [],
};

/**
 * Parses CSV file into AssignmentDoc array using configured parser with Zod validation.
 * @param file - CSV file to parse
 * @returns Promise with ParseResult containing validated data or errors
 */
export const parseAssignmentFromUnservicedReport =
  createCSVParser<AssignmentDoc>(UNSERVICED_PARSE_CONFIG);

// Re-export ParseResult type for consumers
export type { ParseResult } from "./ParserTypes";
