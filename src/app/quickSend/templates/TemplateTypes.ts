import type { TemplateFeatureKey } from "./templateFeatures";

export type TreeNodeType = "category" | "fragment";

/** A single content block authored by the user inside a fragment. */
export type FragmentBlock = {
  /**
   * Stable unique key within the fragment (e.g. "p1", "p2", "tl1").
   * Generated once at add time; never shown to the user.
   */
  blockKey: string;
  /** Optional user-entered display name. Overrides the auto-generated blockKey label in the UI. */
  label?: string;
  /** Which content feature this block uses (e.g. "textLine", "paragraph"). */
  feature: TemplateFeatureKey;
  /** User-authored text with optional {{customer.*}} placeholders. */
  content: string;
  /**
   * Slot number — internal only, never shown to the user.
   * Blocks sharing the same blockId form a "choice group": the sender picks one.
   * Auto-assigned sequentially; "Create Choice" sets selected blocks to the same value.
   */
  blockId: number;
};

export type TreeNodeDoc = {
  nodeId: string;
  parentId: string | null;
  label: string;
  type: TreeNodeType;
  order: number;
  fragment?: {
    /** Points to a componentRegistry entry for dynamic content generation. */
    registryKey?: string;
    /** Active data features (e.g. ["custIdSearch"]). Affect send-view behavior. */
    dataFeatures?: TemplateFeatureKey[];
    /** Ordered content blocks. Source of truth for content — no separate contentFeatures array. */
    blocks?: FragmentBlock[];
  };
};
