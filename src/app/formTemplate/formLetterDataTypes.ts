import type { StaticImageData } from "next/image";
import type { FormLetterData } from "./FormTemplateTypes";
import {
  samplePrepayLetterData,
  prepayLetterContract,
  prepayLetterFormImage,
} from "@/app/prepayLetters/PrepayLetterTypes";
import type React from "react";

// ─── Field Descriptor ─────────────────────────────────────────────────────────

/**
 * Describes how a single slot key is rendered.
 *
 * - `label`: human-readable name shown in the template editor slot list
 * - `render`: react-pdf component — used in `FormLetterDocument` and `PDFViewer`
 * - `previewRender`: DOM component — used in the template editor handles mode overlay
 *
 * Static slots (not backed by data) simply ignore the `value` argument in their renderers.
 */
export type FieldDescriptor<TValue = unknown> = {
  label: string;
  render: (value: TValue) => React.ReactNode;
  previewRender: (value: TValue, scale: number) => React.ReactNode;
};

/**
 * Maps every key of a FormLetterData type to a FieldDescriptor, and allows
 * additional static keys beyond the data type.
 *
 * Use `satisfies FormLetterDataContract<YourDataType>` in the feature's types file
 * to enforce exhaustiveness at compile time for data keys.
 *
 * Note: The `& Record<string, FieldDescriptor<any>>` intersection is intentional.
 * TypeScript's contravariant function parameter checking prevents `FieldDescriptor<string>`
 * from being assignable to `FieldDescriptor<unknown>` (since `unknown` is not assignable
 * to `string`). Using `any` here is the correct escape hatch — it allows the registry
 * to hold a heterogeneous map of typed descriptors while still enforcing exhaustiveness
 * on the data keys via the mapped type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormLetterDataContract<T extends FormLetterData> =
  { [K in keyof T]: FieldDescriptor<T[K]> }
  & Record<string, FieldDescriptor<any>>;

// ─── Registry ─────────────────────────────────────────────────────────────────

type DataTypeDescriptor = {
  /** Display name shown in the data type selector. */
  label: string;
  /** Realistic values — used for the page preview while positioning slots. */
  sampleData: FormLetterData;
  /**
   * Maps each slot key to its rendering descriptor.
   * Includes both data-driven keys (exhaustively enforced by `satisfies`) and
   * optional static keys (e.g. salutations, company name).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contract: Record<string, FieldDescriptor<any>>;
  /**
   * Optional background image of the physical form.
   * Rendered faintly behind the slot boxes in the CSS page preview.
   * Use a statically imported image (not a public URL) to keep it protected.
   */
  backgroundImage?: StaticImageData;
};

/**
 * Registry of all supported form letter data types.
 *
 * To add a new data type:
 * 1. Define `sampleXxxData` and `xxxContract` in the feature's types file.
 * 2. Add an entry here.
 * 3. The editor will automatically pick up the new type.
 */
export const FORM_LETTER_DATA_TYPE_REGISTRY = {
  PrepayLetter: {
    label: "Prepay Letter",
    sampleData: samplePrepayLetterData,
    contract: prepayLetterContract,
    backgroundImage: prepayLetterFormImage,
  },
} as const satisfies Record<string, DataTypeDescriptor>;

export type FormLetterDataType = keyof typeof FORM_LETTER_DATA_TYPE_REGISTRY;

export const FORM_LETTER_DATA_TYPE_OPTIONS = Object.entries(
  FORM_LETTER_DATA_TYPE_REGISTRY,
).map(([value, descriptor]) => ({
  value: value as FormLetterDataType,
  label: descriptor.label,
}));
