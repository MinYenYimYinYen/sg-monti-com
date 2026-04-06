import type { ContentFeatureKey } from "./contentFeatures/contentFeatures";
import type { DataFeatureKey } from "./dataFeatures/dataFeatures";

export type TreeNodeType = "category" | "fragment";

/**
 * A choice group descriptor. Blocks sharing the same `choiceId` form a
 * mutually-exclusive set — the sender picks one at send time.
 */
export type BlockChoice = {
  /** Stable internal key. Auto-assigned; never shown to the user. */
  choiceId: number;
  /** User-visible name for this choice group, e.g. "Program Tier". */
  label?: string;
};

/**
 * An output group descriptor. Blocks sharing the same `groupId` are assembled
 * in order into a single copyable output unit (one Tiptap editor).
 */
export type BlockGroup = {
  /** Stable internal key. Auto-assigned; never shown to the user. */
  groupId: number;
  /** User-visible name for this output group, e.g. "Email Body". */
  label?: string;
};

/** A single content block authored by the user inside a fragment. */
export type FragmentBlock = {
  /**
   * Stable unique key within the fragment (e.g. "p1", "p2", "tl1").
   * Generated once at add time; never shown to the user.
   */
  blockKey: string;
  /** Optional user-entered display name shown in the builder block list. */
  label?: string;
  /** Which content feature this block uses (e.g. "textLine", "paragraph"). */
  feature: ContentFeatureKey;
  /** User-authored text with optional {{customer.*}} placeholders. */
  content: string;
  /**
   * Choice group this block belongs to.
   * Blocks sharing the same `choice.choiceId` form a mutually-exclusive set.
   * Each block gets a unique choiceId by default (no choice grouping).
   */
  choice: BlockChoice;
  /**
   * Output group this block belongs to.
   * Blocks sharing the same `group.groupId` are assembled into one output.
   * Each block gets a unique groupId by default (no output grouping).
   */
  group: BlockGroup;
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
    dataFeatures?: DataFeatureKey[];
    /** Ordered content blocks. Source of truth for content — no separate contentFeatures array. */
    blocks?: FragmentBlock[];
  };
};
