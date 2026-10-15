import type { StaticImageData } from "next/image";
import {
  samplePrepayLetterData,
  prepayLetterContract,
  prepayLetterFormImage,
} from "@/app/prepayLetters/PrepayLetterTypes";
import type React from "react";
import type {
  OptionValue,
  SlotOptionSchema,
} from "@/app/formTemplate/slotOptionSchema";

// ─── Field Descriptor ─────────────────────────────────────────────────────────

/**
 * Describes how a single slot key is rendered — no configurable options.
 *
 * - `label`: human-readable name shown in the template editor slot list
 * - `render`: react-pdf component — used in `FormLetterDocument` and `PDFViewer`
 * - `previewRender`: DOM component — used in the template editor handles mode overlay
 *
 * Renderers receive the full data object (`TData`) rather than a single extracted value.
 * Static slots (not backed by data) simply ignore the `data` argument in their renderers.
 */
export type FieldDescriptor<TData = unknown> = {
  label: string;
  render: (data: TData) => React.ReactNode;
  previewRender: (data: TData, scale: number) => React.ReactNode;
};

/**
 * Describes how a single slot key is rendered — with user-configurable options.
 *
 * - `optionSchema`: declares which options this element exposes and their UI controls.
 *   Must be defined in the same feature file and imported from `slotOptionSchema.ts`.
 * - `render` / `previewRender`: receive the resolved options object as a third argument.
 *
 * Options are stored loosely in `FormLetterSlotDoc.options` and sanitized against
 * `optionSchema` on the server read path before reaching the client.
 */
export type FieldDescriptorWithOptions<
  TData = unknown,
  TOptions extends Record<string, OptionValue> = Record<string, OptionValue>,
> = {
  label: string;
  optionSchema: SlotOptionSchema<TOptions>;
  render: (data: TData, options: TOptions) => React.ReactNode;
  previewRender: (data: TData, scale: number, options: TOptions) => React.ReactNode;
};

/** Union of both descriptor variants. Used in the registry and editor. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFieldDescriptor<TData = unknown> =
  | FieldDescriptor<TData>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | FieldDescriptorWithOptions<TData, any>;

/** Type guard — true when the descriptor declares configurable options. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hasOptions(d: AnyFieldDescriptor<any>): d is FieldDescriptorWithOptions<any, any> {
  return "optionSchema" in d;
}

/**
 * A contract that maps a set of named slot keys to their rendering descriptors.
 *
 * - `TData`: the full input data object passed to every renderer in this contract.
 * - `TSlots`: a string union of all slot keys the contract must provide.
 *
 * Use `satisfies FormLetterContract<YourData, YourSlots>` in the feature's types file
 * to enforce exhaustiveness at compile time — every key in `TSlots` must be present.
 * Extra static keys beyond `TSlots` are allowed.
 */
export type FormLetterContract<TData, TSlots extends string> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { [K in TSlots]: AnyFieldDescriptor<TData> }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  & Record<string, AnyFieldDescriptor<TData>>;

// ─── Registry ─────────────────────────────────────────────────────────────────

type DataTypeDescriptor = {
  /** Display name shown in the data type selector. */
  label: string;
  /** Realistic values — used for the page preview while positioning slots. */
  sampleData: unknown;
  /**
   * Maps each slot key to its rendering descriptor.
   * Typed as `AnyFieldDescriptor<unknown>` here so the registry can hold heterogeneous
   * contracts. Each feature's contract is correctly typed via `FormLetterContract`
   * at the point of definition.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contract: Record<string, AnyFieldDescriptor<any>>;
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
