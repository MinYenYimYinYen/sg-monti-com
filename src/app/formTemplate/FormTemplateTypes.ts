import type { LabelValuePair } from "@/lib/pdf/_components/LabelValueList";

// ─── Slot ─────────────────────────────────────────────────────────────────────

/**
 * A single positioned slot in a form letter template.
 * `key` bridges the template to the data contract — it must match a key in the
 * feature's `FormLetterDataContract`. The contract owns all rendering decisions;
 * the slot only stores position.
 */
export type FormLetterSlotDoc = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

// ─── Template ─────────────────────────────────────────────────────────────────

export type FormLetterTemplateDoc = {
  templateId: string;
  templateName: string;
  /** Identifies which data contract this template consumes. Must be a registered key in FORM_LETTER_DATA_TYPE_REGISTRY. */
  dataType: import("./formLetterDataTypes").FormLetterDataType;
  pageSize: "LETTER" | "LEGAL";
  slots: FormLetterSlotDoc[];
};

// ─── Data ─────────────────────────────────────────────────────────────────────

/**
 * The runtime data object passed to `FormLetterDocument`.
 * Scalar slots receive `string | number | null`.
 * LabelValueList slots receive `LabelValuePair[]`.
 * Static slots (defined in the contract but not in the data type) receive `undefined`.
 */
export type FormLetterData = Record<
  string,
  string | number | null | LabelValuePair[] | undefined
>;

// Re-export for convenience so consumers only need to import from this file.
export type { LabelValuePair };
