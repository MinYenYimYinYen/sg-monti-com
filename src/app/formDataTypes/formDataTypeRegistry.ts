import type { FormDataTypeDescriptor } from "@/app/formTemplate/formDataContract";
import {
  samplePrepayLetterData,
  prepayLetterContract,
  prepayLetterFormImage,
} from "@/app/prepayLetters/PrepayLetterTypes";

/**
 * Registry of all supported form data types. This is the one place that knows about
 * the features; `formTemplate` itself is generic and never imports a feature.
 *
 * To add a new data type:
 * 1. Define the data type, `xxxContract`, and `sampleXxxData` in the feature.
 * 2. Add an entry here.
 * 3. The editor and any batch module pick it up from this registry.
 */
export const FORM_DATA_TYPE_REGISTRY = {
  PrepayLetter: {
    label: "Prepay Letter",
    sampleData: samplePrepayLetterData,
    contract: prepayLetterContract,
    backgroundImage: prepayLetterFormImage,
  },
} as const satisfies Record<string, FormDataTypeDescriptor>;

export type FormDataType = keyof typeof FORM_DATA_TYPE_REGISTRY;

export const FORM_DATA_TYPE_OPTIONS = Object.entries(
  FORM_DATA_TYPE_REGISTRY,
).map(([value, descriptor]) => ({
  value: value as FormDataType,
  label: descriptor.label,
}));
