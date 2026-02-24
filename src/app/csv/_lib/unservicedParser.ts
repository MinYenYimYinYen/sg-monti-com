import { z } from "zod";
import { AssignmentDoc } from "../../realGreen/customer/_lib/entities/types/ServiceTypes";
import { dateParser } from "@/lib/primatives/dates/dateParse";
import { ParseConfig } from "./ParserTypes";
import { createCSVParser } from "@/app/csv/_lib/parserFactory";

// Zod schema for ServiceUnserviced validation
const ServiceUnservicedSchema = z.object({
  servId: z.number().positive("Service ID must be a positive number"),
  employeeId: z.string().min(1, "Employee ID cannot be empty"),
  schedDate: z.string().min(1, "Scheduled date cannot be empty"),
  status: z.string().min(1, "Status cannot be empty"),
});

const UNSERVICED_PARSE_CONFIG: ParseConfig<AssignmentDoc> = {
  columnMappings: {
    ServiceId: "servId",
    AssignedToEmployeeId: "employeeId",
    ScheduledDateAsDate: "schedDate",
    ServiceStatus: "status",
  },
  requiredColumns: [
    "ServiceId",
    "AssignedToEmployeeId",
    "ScheduledDateAsDate",
    "ServiceStatus",
  ],
  optionalColumns: [],
  transformations: {
    ServiceId: (val) => parseInt(val, 10),
    AssignedToEmployeeId: (val) => val.trim(),

    //Todo: need to check this down stream
    ScheduledDateAsDate: (val) =>
      dateParser.tryParseDate(val.split(" ")[0]) ?? "",

    //Todo: this is just to double check we're only taking printed services.
    ServiceStatus: (val) => val.trim(),

    // Date transformation can be added here if needed
    // "Service Date": (val) => new Date(val).toISOString(),
  },
  schema: ServiceUnservicedSchema,
};

/**
 * Parses CSV file into ServiceUnserviced array using configured parser with Zod validation
 * @param file - CSV file to parse
 * @returns Promise with ParseResult containing validated data or errors
 */
export const parseAssignmentFromUnservicedReport = createCSVParser<AssignmentDoc>(
  UNSERVICED_PARSE_CONFIG,
);

// Re-export ParseResult type for consumers
export type { ParseResult } from "./ParserTypes";
