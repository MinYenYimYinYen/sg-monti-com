import type { FragmentBlock } from "@/app/quickSend/templates/TemplateTypes";
import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type { GlobalSettings } from "@/app/globalSettings/_lib/GlobalSettingsTypes";
import {
  CUSTOMER_VARIABLES,
  type CustomerVariableKey,
  GLOBAL_SETTINGS_VARIABLES,
  type GlobalSettingsVariableKey,
} from "@/app/quickSend/templates/dataFeatures/dataFeatureVariables";

export type ResolvedGroup = {
  groupId: number;
  label?: string;
  html: string;
};

/**
 * Resolves a fragment's blocks into output groups.
 *
 * Steps:
 * 1. For each choiceId with multiple blocks, keep only the block whose
 *    blockKey matches activeChoices[choiceId] (defaults to first block).
 * 2. Replace {{customer.<key>}} and {{globalSettings.<key>}} spans with actual values,
 *    or [Label] placeholders if data is not loaded.
 * 3. Group surviving blocks by groupId (first-occurrence order) and
 *    concatenate their HTML.
 */
export function resolveTemplate(
  blocks: FragmentBlock[],
  activeChoices: Record<number, string>,
  customer: Customer | null,
  globalSettings: GlobalSettings | null,
): ResolvedGroup[] {
  // Step 1: resolve choices
  const choiceWinners = resolveChoices(blocks, activeChoices);

  // Step 2: resolve variables in each block's content
  const resolved = choiceWinners.map((block) => ({
    ...block,
    content: resolveVariables(block.content, customer, globalSettings),
  }));

  // Step 3: group by groupId in first-occurrence order
  return buildGroups(resolved);
}

// ─── Choice resolution ───────────────────────────────────────────────────────

function resolveChoices(
  blocks: FragmentBlock[],
  activeChoices: Record<number, string>,
): FragmentBlock[] {
  // Build a count of blocks per choiceId
  const choiceIdCounts = blocks.reduce<Record<number, number>>((acc, b) => {
    acc[b.choice.choiceId] = (acc[b.choice.choiceId] ?? 0) + 1;
    return acc;
  }, {});

  const seen = new Set<number>();
  const result: FragmentBlock[] = [];

  for (const block of blocks) {
    const { choiceId } = block.choice;
    const isChoice = choiceIdCounts[choiceId] > 1;

    if (!isChoice) {
      result.push(block);
      continue;
    }

    if (seen.has(choiceId)) continue;
    seen.add(choiceId);

    // Find the active selection for this choiceId, defaulting to the first block
    const activeKey = activeChoices[choiceId];
    const choiceBlocks = blocks.filter((b) => b.choice.choiceId === choiceId);
    const winner = choiceBlocks.find((b) => b.blockKey === activeKey) ?? choiceBlocks[0];
    result.push(winner);
  }

  return result;
}

// ─── Variable resolution ─────────────────────────────────────────────────────

// Matches <span ... data-type="mention" data-id="<key>">{{...}}</span>
// The data-id can be "displayName" or "globalSettings.season"
const MENTION_SPAN_RE =
  /<span[^>]*data-type="mention"[^>]*data-id="([^"]+)"[^>]*>.*?<\/span>/g;
// Matches plain {{customer.<key>}} and {{globalSettings.<key>}} text (fallback)
const PLAIN_CUSTOMER_VAR_RE = /\{\{customer\.([^}]+)\}\}/g;
const PLAIN_GLOBAL_SETTINGS_VAR_RE = /\{\{globalSettings\.([^}]+)\}\}/g;

function resolveVariables(
  html: string,
  customer: Customer | null,
  globalSettings: GlobalSettings | null,
): string {
  const replaceCustomer = (key: string): string => {
    if (customer && key in customer) {
      return String(customer[key as keyof Customer]);
    }
    const label = CUSTOMER_VARIABLES[key as CustomerVariableKey];
    return label ? `[${label}]` : `[${key}]`;
  };

  const replaceGlobalSettings = (key: string): string => {
    if (globalSettings && key in globalSettings) {
      return String(globalSettings[key as keyof GlobalSettings]);
    }
    const label = GLOBAL_SETTINGS_VARIABLES[key as GlobalSettingsVariableKey];
    return label ? `[${label}]` : `[${key}]`;
  };

  const replaceMentionSpan = (_match: string, id: string): string => {
    // If id contains ".", it's "globalSettings.season" format
    if (id.includes(".")) {
      const key = id.split(".")[1]; // Extract "season" from "globalSettings.season"
      return replaceGlobalSettings(key);
    }
    // Otherwise it's a customer variable key like "displayName"
    return replaceCustomer(id);
  };

  return html
    .replace(MENTION_SPAN_RE, replaceMentionSpan)
    .replace(PLAIN_CUSTOMER_VAR_RE, (_match, key: string) => replaceCustomer(key))
    .replace(PLAIN_GLOBAL_SETTINGS_VAR_RE, (_match, key: string) => replaceGlobalSettings(key));
}

// ─── Group assembly ──────────────────────────────────────────────────────────

function buildGroups(blocks: FragmentBlock[]): ResolvedGroup[] {
  const groupMap = new Map<number, string[]>();
  const groupLabelMap = new Map<number, string | undefined>();
  const firstBlockLabelMap = new Map<number, string | undefined>();
  const groupOrder: number[] = [];

  for (const block of blocks) {
    const { groupId, label } = block.group;
    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, []);
      groupLabelMap.set(groupId, label);
      firstBlockLabelMap.set(groupId, block.label); // Track first block's label
      groupOrder.push(groupId);
    }
    groupMap.get(groupId)!.push(block.content);
  }

  return groupOrder.map((groupId) => {
    const groupLabel = groupLabelMap.get(groupId);
    const firstBlockLabel = firstBlockLabelMap.get(groupId);
    return {
      groupId,
      // Use group label if defined, otherwise fall back to first block's label
      label: groupLabel ?? firstBlockLabel,
      html: groupMap.get(groupId)!.join(""),
    };
  });
}
