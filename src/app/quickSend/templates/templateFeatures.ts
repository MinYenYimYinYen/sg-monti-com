// ─── Data Features ──────────────────────────────────────────────────────────
// UI-level features that affect send-view behavior.
// They do not produce content blocks.

export type DataFeatureDef = {
  key: string;
  label: string;
  description: string;
};

export const DATA_FEATURE_DEFS = [
  {
    key: "custIdSearch",
    label: "Customer Lookup",
    description:
      "Adds a customer ID input to the send view. Enables @-mention variables.",
  },
] as const satisfies readonly DataFeatureDef[];

export type DataFeatureKey = (typeof DATA_FEATURE_DEFS)[number]["key"];

export function getDataFeatureDef(key: DataFeatureKey): DataFeatureDef {
  return DATA_FEATURE_DEFS.find((f) => f.key === key)!;
}

// ─── Content Features ────────────────────────────────────────────────────────
// Features that produce content blocks the user fills in via a Tiptap editor.

export type ContentFeatureDef = {
  key: string;
  label: string;
  description: string;
  /** Whether the Tiptap editor allows multiple lines. False = Enter suppressed. */
  multiLine: boolean;
};

export const CONTENT_FEATURE_DEFS = [
  {
    key: "textLine",
    label: "Text Line",
    description: "A single line of text (e.g. greeting or subject line).",
    multiLine: false,
  },
  {
    key: "paragraph",
    label: "Paragraph",
    description: "A multi-line block of text.",
    multiLine: true,
  },
] as const satisfies readonly ContentFeatureDef[];

export type ContentFeatureKey = (typeof CONTENT_FEATURE_DEFS)[number]["key"];

export function getContentFeatureDef(key: ContentFeatureKey): ContentFeatureDef {
  return CONTENT_FEATURE_DEFS.find((f) => f.key === key)!;
}

// ─── Union ───────────────────────────────────────────────────────────────────
// Used only where a value could be either kind (e.g. legacy storage migration).

export type TemplateFeatureKey = DataFeatureKey | ContentFeatureKey;
