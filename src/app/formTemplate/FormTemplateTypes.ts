// ─── Slot ─────────────────────────────────────────────────────────────────────

/**
 * A single positioned slot in a form template.
 * `key` bridges the template to the data contract: it must match a key in the
 * data type's `FormDataContract`. The contract owns all rendering decisions;
 * the slot only stores position and any user-configured options.
 *
 * `options` is stored as a loose record. Renderers merge it over the descriptor's
 * `getSchemaDefaults(optionSchema)`, so options added later still resolve.
 */
export type FormTemplateSlotDoc = {
  /** Unique identifier for this slot instance — allows the same key to appear multiple times. */
  slotId: string;
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Persisted per-slot options, merged over the schema defaults at render time. */
  options?: Record<string, unknown>;
};

// ─── Template ─────────────────────────────────────────────────────────────────

/**
 * `TDataType` defaults to `string` so the generic template module never depends on a
 * feature. Code that holds the registry narrows it to `FormDataType`.
 *
 * Natural key: `templateName + saId`. `templateId` is a slug derived from both on the
 * server at save time. An empty `templateId` means the draft has never been saved.
 */
export type FormTemplateDoc<TDataType extends string = string> = {
  templateId: string;
  templateName: string;
  /**
   * The author's `saId` (from the auth token). Empty on templates saved before ownership
   * existed; nobody owns those, so nobody can overwrite or delete them.
   */
  saId: string;
  /** Key of the registered form data type this template consumes. */
  dataType: TDataType;
  pageSize: "LETTER" | "LEGAL";
  slots: FormTemplateSlotDoc[];
};
