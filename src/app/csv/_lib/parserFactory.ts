import Papa from "papaparse";
import {
  ParseConfig,
  ParseResult,
  ColumnValidation,
  TransformResult,
} from "./ParserTypes";

/**
 * Validates that all required columns are present in CSV headers
 */
function validateColumns<T extends object>(
  headers: string[],
  config: ParseConfig<T>,
): ColumnValidation {
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
 * Transforms a CSV row into target format and validates with Zod schema
 */
function transformRow<T extends object>(
  row: Record<string, string>,
  config: ParseConfig<T>,
): TransformResult<T> {
  try {
    const result: Partial<T> = {};

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

    // Validate the transformed object with Zod schema
    const validation = config.schema.safeParse(result);

    if (!validation.success) {
      const errorMessages = validation.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return { error: `Validation failed: ${errorMessages}` };
    }

    return validation.data;
  } catch (error) {
    return {
      error: `Transformation error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Creates a CSV parser function configured for a specific output type
 * @template T - The target output type
 * @param config - Parse configuration defining mappings, transformations, and Zod schema
 * @returns Parser function that accepts a File and returns Promise<ParseResult<T>>
 *
 * @example
 * const schema = z.object({
 *   servId: z.number().positive(),
 *   employeeId: z.string().min(1),
 * });
 *
 * const config: ParseConfig<ServiceUnserviced> = {
 *   columnMappings: { "ServiceId": "servId", "EmployeeId": "employeeId" },
 *   requiredColumns: ["ServiceId", "EmployeeId"],
 *   optionalColumns: [],
 *   transformations: { "ServiceId": (val) => parseInt(val, 10) },
 *   schema
 * };
 *
 * const parser = createCSVParser(config);
 * const result = await parser(file);
 */
export function createCSVParser<T extends object>(
  config: ParseConfig<T>,
): (file: File) => Promise<ParseResult<T>> {
  return async (file: File): Promise<ParseResult<T>> => {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
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
          const data: T[] = [];
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
            resolve({
              success: false,
              errors,
              partialData: data.length > 0 ? data : undefined,
            });
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
  };
}
