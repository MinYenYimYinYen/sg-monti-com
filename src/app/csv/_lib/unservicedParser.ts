import { z } from "zod";
import { AssignmentDoc } from "../../realGreen/customer/_lib/entities/types/ServiceTypes";
import { dateParser } from "@/lib/primatives/dates/dateParse";
import { ParseConfig } from "./ParserTypes";
import { createCSVParser } from "@/app/csv/_lib/parserFactory";

// eta is not present in the CSV — it is entered by the user at runtime.
// The parserFactory injects { eta: null } as a default before Zod validation,
// so the schema includes it as z.null() to satisfy AssignmentDoc's shape.
const ServiceUnservicedSchema = z.object({
  servId: z.number().positive("Service ID must be a positive number"),
  employeeId: z.string().min(1, "Employee ID cannot be empty"),
  schedDate: z.string().min(1, "Scheduled date cannot be empty"),
  status: z.string().min(1, "Status cannot be empty"),
  sequence: z.number().positive("Sequence must be a positive number"),
  eta: z.null(),
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
    "Sequence"
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

    // RealGreen stores sequence multiplied by 10; divide to normalize.
    Sequence: (val) => parseInt(val, 10) / 10,
  },
  schema: ServiceUnservicedSchema,
};

/**
 * Parses CSV file into AssignmentDoc array using configured parser with Zod validation.
 * eta is not present in the CSV — it defaults to null and is set by the user at runtime.
 * @param file - CSV file to parse
 * @returns Promise with ParseResult containing validated data or errors
 */
export const parseAssignmentFromUnservicedReport = createCSVParser<AssignmentDoc>(
  UNSERVICED_PARSE_CONFIG,
);

// Re-export ParseResult type for consumers
export type { ParseResult } from "./ParserTypes";
