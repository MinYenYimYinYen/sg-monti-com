// ─── Slot ─────────────────────────────────────────────────────────────────────

/**
 * A single positioned slot in a form letter template.
 * `key` bridges the template to the data contract — it must match a key in the
 * feature's `FormLetterDataContract`. The contract owns all rendering decisions;
 * the slot only stores position and any user-configured options.
 *
 * `options` is stored as a loose record and sanitized against the descriptor's
 * `optionSchema` on the server read path — so the client always receives a
 * fully valid options object.
 */
export type FormLetterSlotDoc = {
  /** Unique identifier for this slot instance — allows the same key to appear multiple times. */
  slotId: string;
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Persisted per-slot options. Sanitized against the descriptor's optionSchema on read. */
  options?: Record<string, unknown>;
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
