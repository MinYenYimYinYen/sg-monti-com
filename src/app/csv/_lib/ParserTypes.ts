import { z } from "zod";

/**
 * Generic parse configuration for CSV to typed object transformation
 * @template T - The target output type
 */
export type ParseConfig<T> = {
  /** Maps CSV column names to target object property names */
  columnMappings: Record<string, keyof T>;

  /** CSV columns that must be present and non-empty */
  requiredColumns: string[];

  /** CSV columns that may be present but are not required */
  optionalColumns: string[];

  /** Functions to transform CSV string values to target types */
  transformations: Record<string, (value: string) => any>;

  /** Zod schema to validate transformed objects */
  schema: z.ZodSchema<T>;
};

/**
 * Result of parsing operation - either success with data or failure with errors
 * @template T - The target output type
 */
export type ParseResult<T> =
  | { success: true; data: T[] }
  | { success: false; errors: string[]; partialData?: T[] };

/**
 * Internal validation result for column checking
 */
export type ColumnValidation =
  | { valid: true }
  | { valid: false; errors: string[] };

/**
 * Internal result for row transformation
 * @template T - The target output type
 */
export type TransformResult<T> = T | { error: string };
