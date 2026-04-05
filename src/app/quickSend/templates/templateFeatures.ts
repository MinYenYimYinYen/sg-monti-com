/**
 * Defines all available template features with their display metadata.
 * Use `TEMPLATE_FEATURE_DEFS` as the single source of truth for feature configuration.
 */
export const TEMPLATE_FEATURE_DEFS = [
  // --- Data Features ---
  // These are UI-level features that affect how the send view behaves.
  // They do not produce content blocks themselves.
  {
    key: "custIdSearch",
    label: "Customer Lookup",
    category: "data" as const,
    description: "Adds a customer ID input to the send view. Enables @-mention variables.",
    isContentBlock: false,
  },

  // --- Content Features ---
  // These produce content blocks that the user fills in via a Tiptap editor.
  // textLine: single-line (Enter suppressed). paragraph: multi-line.
  {
    key: "textLine",
    label: "Text Line",
    category: "content" as const,
    description: "A single line of text (e.g. greeting or subject line).",
    isContentBlock: true,
  },
  {
    key: "paragraph",
    label: "Paragraph",
    category: "content" as const,
    description: "A multi-line block of text.",
    isContentBlock: true,
  },
] as const;

export type TemplateFeatureKey = (typeof TEMPLATE_FEATURE_DEFS)[number]["key"];
export type TemplateFeatureCategory = "data" | "content";

export type TemplateFeatureDef = (typeof TEMPLATE_FEATURE_DEFS)[number];

export const DATA_FEATURES = TEMPLATE_FEATURE_DEFS.filter(
  (f) => f.category === "data",
);

export const CONTENT_FEATURES = TEMPLATE_FEATURE_DEFS.filter(
  (f) => f.category === "content",
);

/** Look up a feature definition by key. */
export function getFeatureDef(key: TemplateFeatureKey): TemplateFeatureDef {
  return TEMPLATE_FEATURE_DEFS.find((f) => f.key === key)!;
}
