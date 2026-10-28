/**
 * Slot option schema system.
 *
 * No React, Mongoose, or Next.js imports allowed in this file.
 * It is consumed by:
 *   - `formDataContract.ts` (client) — for typing FieldDescriptorWithOptions
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
