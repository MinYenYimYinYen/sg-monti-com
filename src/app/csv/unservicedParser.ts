import Papa from "papaparse";
import { ServiceUnserviced } from "../realGreen/customer/_lib/entities/types/ServiceTypes";
import { dateParser } from "@/lib/primatives/dates/dateParse";

// Parse configuration structured for future MongoDB extension
type ParseConfig = {
  columnMappings: Record<string, keyof ServiceUnserviced>;
  requiredColumns: string[];
  optionalColumns: string[];
  transformations: Record<string, (value: string) => string | number>;
};

const UNSERVICED_PARSE_CONFIG: ParseConfig = {
  columnMappings: {
    ServiceId: "servId",
    AssignedToEmployeeId: "employeeId",
    ScheduledDateAsDate: "schedDate",
    ServiceStatus: "status",
  },
  requiredColumns: [
    "ServiceId:",
    "AssignedToEmployeeId:",
    "ScheduledDateAsDate:",
    "ServiceStatus:",
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
};

export type ParseResult<T> =
  | { success: true; data: T[] }
  | { success: false; errors: string[] };

/**
 * Validates that all required columns are present in CSV headers
 */
function validateColumns(
  headers: string[],
  config: ParseConfig,
): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = [];
  const missingColumns = config.requiredColumns.filter(
    (col) => !headers.includes(col),
  );

  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(", ")}`);
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

/**
 * Transforms a CSV row into ServiceUnserviced format
 */
function transformRow(
  row: Record<string, string>,
  config: ParseConfig,
): ServiceUnserviced | { error: string } {
  try {
    const result: Partial<ServiceUnserviced> = {};

    for (const [csvColumn, targetField] of Object.entries(
      config.columnMappings,
    )) {
      const value = row[csvColumn];

      if (value === undefined || value === "") {
        if (config.requiredColumns.includes(csvColumn)) {
          return { error: `Missing required value for column: ${csvColumn}` };
        }
        continue;
      }

      // Apply transformation if defined
      const transformation = config.transformations[csvColumn];
      const transformedValue = transformation ? transformation(value) : value;

      result[targetField] = transformedValue as any;
    }

    // Validate all required fields are present
    const missingFields = (
      Object.keys(config.columnMappings) as Array<keyof ServiceUnserviced>
    ).filter((field) => result[field] === undefined);

    if (missingFields.length > 0) {
      return { error: `Missing required fields: ${missingFields.join(", ")}` };
    }

    return result as ServiceUnserviced;
  } catch (error) {
    return {
      error: `Transformation error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Parses CSV file into ServiceUnserviced array
 * @param file - CSV file to parse
 * @param config - Optional parse configuration (defaults to UNSERVICED_PARSE_CONFIG)
 * @returns Promise with ParseResult containing data or errors
 */
export async function parseServiceCSV(
  file: File,
  config: ParseConfig = UNSERVICED_PARSE_CONFIG,
): Promise<ParseResult<ServiceUnserviced>> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(), // Normalize headers
      complete: (results) => {
        const errors: string[] = [];

        // Validate columns
        const headers = results.meta.fields || [];
        const columnValidation = validateColumns(headers, config);

        if (!columnValidation.valid) {
          resolve({ success: false, errors: columnValidation.errors });
          return;
        }

        // Transform rows
        const data: ServiceUnserviced[] = [];
        results.data.forEach((row, index) => {
          const transformed = transformRow(
            row as Record<string, string>,
            config,
          );

          if ("error" in transformed) {
            errors.push(`Row ${index + 2}: ${transformed.error}`);
          } else {
            data.push(transformed);
          }
        });

        // Check for Papa Parse errors
        if (results.errors.length > 0) {
          results.errors.forEach((err) => {
            errors.push(`Parse error at row ${err.row}: ${err.message}`);
          });
        }

        if (errors.length > 0) {
          resolve({ success: false, errors });
        } else {
          resolve({ success: true, data });
        }
      },
      error: (error) => {
        resolve({
          success: false,
          errors: [`Failed to parse CSV: ${error.message}`],
        });
      },
    });
  });
}
