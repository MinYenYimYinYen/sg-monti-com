/**
 * Slot option schema system — shared between client and server.
 *
 * No React, Mongoose, or Next.js imports allowed in this file.
 * It is consumed by:
 *   - `formLetterDataTypes.ts` (client) — for typing FieldDescriptorWithOptions
 *   - `api/route.ts` (server) — for sanitizing stored options on read
 *   - `SlotEditor.tsx` (client) — for rendering option controls
 */

// ─── Primitive option value types ─────────────────────────────────────────────

export type OptionValue = string | number | boolean;

// ─── Field schema variants ────────────────────────────────────────────────────

export type NumberOptionField = {
  type: "number";
  label: string;
  min?: number;
  max?: number;
  step?: number;
  default: number;
};

export type SelectOptionField<T extends string | number = string | number> = {
  type: "select";
  label: string;
  choices: { label: string; value: T }[];
  default: T;
};

export type BooleanOptionField = {
  type: "boolean";
  label: string;
  default: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OptionFieldSchema = NumberOptionField | SelectOptionField<any> | BooleanOptionField;

// ─── Schema map ───────────────────────────────────────────────────────────────

/**
 * Maps each key of `TOptions` to its field descriptor.
 * When a `FieldDescriptorWithOptions` declares `optionSchema`, this type enforces
 * that every option key has a corresponding schema entry.
 */
export type SlotOptionSchema<TOptions extends Record<string, OptionValue>> = {
  [K in keyof TOptions]: OptionFieldSchema;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts the default values from a schema.
 * Use this as the "base" options object — returned when stored options are absent.
 */
export function getSchemaDefaults<TOptions extends Record<string, OptionValue>>(
  schema: SlotOptionSchema<TOptions>,
): TOptions {
  return Object.fromEntries(
    Object.entries(schema).map(([key, field]) => [key, field.default]),
  ) as TOptions;
}

/**
 * Sanitizes a stored options object against a schema.
 *
 * - Keys not in the schema are dropped (handles options that were later removed).
 * - Missing keys are filled from schema defaults (handles newly added options).
 * - Values of the wrong primitive type are replaced with the schema default.
 *
 * This is called on the server read path so the client always receives a fully
 * valid options object regardless of how stale the stored data is.
 */
export function sanitizeOptions<TOptions extends Record<string, OptionValue>>(
  stored: Record<string, unknown>,
  schema: SlotOptionSchema<TOptions>,
): TOptions {
  const defaults = getSchemaDefaults(schema);
  const result: Record<string, OptionValue> = {};
  for (const key of Object.keys(schema)) {
    const storedValue = stored[key];
    const expectedType = typeof defaults[key as keyof TOptions];
    result[key] =
      typeof storedValue === expectedType
        ? (storedValue as OptionValue)
        : (defaults[key as keyof TOptions] as OptionValue);
  }
  return result as TOptions;
}
