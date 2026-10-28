import type { StaticImageData } from "next/image";
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
 * - `render`: react-pdf component — used in `FormDocument` and `PDFViewer`
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
 * Options are stored loosely in `FormTemplateSlotDoc.options`. Renderers always receive
 * them merged over `getSchemaDefaults(optionSchema)`, so adding an option is safe.
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
export type AnyFieldDescriptor<TData = unknown> =
  | FieldDescriptor<TData>
  | FieldDescriptorWithOptions<TData, any>;

/** Type guard — true when the descriptor declares configurable options. */
export function hasOptions(d: AnyFieldDescriptor<any>): d is FieldDescriptorWithOptions<any, any> {
  return "optionSchema" in d;
}

/**
 * A contract that maps a set of named slot keys to their rendering descriptors.
 *
 * - `TData`: the full input data object passed to every renderer in this contract.
 * - `TSlots`: a string union of all slot keys the contract must provide.
 *
 * Use `satisfies FormDataContract<YourData, YourSlots>` in the feature's types file
 * to enforce exhaustiveness at compile time — every key in `TSlots` must be present.
 * Extra static keys beyond `TSlots` are allowed.
 */
export type FormDataContract<TData, TSlots extends string> =
  { [K in TSlots]: AnyFieldDescriptor<TData> }
  & Record<string, AnyFieldDescriptor<TData>>;

// ─── Registry entry shape ─────────────────────────────────────────────────────

/**
 * Shape of one registered form data type. The registry itself lives in
 * `@/app/formDataTypes/formDataTypeRegistry` so this module never imports a feature.
 */
export type FormDataTypeDescriptor = {
  /** Display name shown in the data type selector. */
  label: string;
  /** Realistic values — used for the page preview while positioning slots. */
  sampleData: unknown;
  /**
   * Maps each slot key to its rendering descriptor.
   * Typed as `AnyFieldDescriptor<unknown>` here so the registry can hold heterogeneous
   * contracts. Each feature's contract is correctly typed via `FormDataContract`
   * at the point of definition.
   */
  contract: Record<string, AnyFieldDescriptor<any>>;
  /**
   * Optional background image of the physical form.
   * Rendered faintly behind the slot boxes in the CSS page preview.
   * Use a statically imported image (not a public URL) to keep it protected.
   */
  backgroundImage?: StaticImageData;
};

