import type { FragmentBlock } from "@/app/quickSend/templates/TemplateTypes";
import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { CUSTOMER_VARIABLES, type CustomerVariableKey } from "@/app/quickSend/templates/templateVariables";

export type ResolvedGroup = {
  groupId: number;
  html: string;
};

/**
 * Resolves a fragment's blocks into output groups.
 *
 * Steps:
 * 1. For each choiceId with multiple blocks, keep only the block whose
 *    blockKey matches activeChoices[choiceId] (defaults to first block).
 * 2. Replace {{customer.<key>}} spans with the customer's actual value,
 *    or a [Label] placeholder if no customer is loaded.
 * 3. Group surviving blocks by groupId (first-occurrence order) and
 *    concatenate their HTML.
 */
export function resolveTemplate(
  blocks: FragmentBlock[],
  activeChoices: Record<number, string>,
  customer: Customer | null,
): ResolvedGroup[] {
  // Step 1: resolve choices
  const choiceWinners = resolveChoices(blocks, activeChoices);

  // Step 2: resolve variables in each block's content
  const resolved = choiceWinners.map((block) => ({
    ...block,
    content: resolveVariables(block.content, customer),
  }));

  // Step 3: group by groupId in first-occurrence order
  return buildGroups(resolved);
}

// ─── Choice resolution ───────────────────────────────────────────────────────

function resolveChoices(
  blocks: FragmentBlock[],
  activeChoices: Record<number, string>,
): FragmentBlock[] {
  // Build a set of choiceIds that have multiple blocks
  const choiceIdCounts = blocks.reduce<Record<number, number>>((acc, b) => {
    acc[b.choiceId] = (acc[b.choiceId] ?? 0) + 1;
    return acc;
  }, {});

  const seen = new Set<number>();
  const result: FragmentBlock[] = [];

  for (const block of blocks) {
    const isChoice = choiceIdCounts[block.choiceId] > 1;

    if (!isChoice) {
      result.push(block);
      continue;
    }

    if (seen.has(block.choiceId)) continue;
    seen.add(block.choiceId);

    // Find the active selection for this choiceId, defaulting to the first block
    const activeKey = activeChoices[block.choiceId];
    const choiceBlocks = blocks.filter((b) => b.choiceId === block.choiceId);
    const winner = choiceBlocks.find((b) => b.blockKey === activeKey) ?? choiceBlocks[0];
    result.push(winner);
  }

  return result;
}

// ─── Variable resolution ─────────────────────────────────────────────────────

// Matches <span ... data-type="mention" data-id="<key>">{{customer.<key>}}</span>
// and plain {{customer.<key>}} text (fallback)
const MENTION_SPAN_RE =
  /<span[^>]*data-type="mention"[^>]*data-id="([^"]+)"[^>]*>.*?<\/span>/g;
const PLAIN_VAR_RE = /\{\{customer\.([^}]+)\}\}/g;

function resolveVariables(html: string, customer: Customer | null): string {
  const replace = (key: string): string => {
    if (customer && key in customer) {
      return String(customer[key as keyof Customer]);
    }
    // Placeholder: use the human-readable label if available
    const label = CUSTOMER_VARIABLES[key as CustomerVariableKey];
    return label ? `[${label}]` : `[${key}]`;
  };

  return html
    .replace(MENTION_SPAN_RE, (_match, key: string) => replace(key))
    .replace(PLAIN_VAR_RE, (_match, key: string) => replace(key));
}

// ─── Group assembly ──────────────────────────────────────────────────────────

function buildGroups(blocks: FragmentBlock[]): ResolvedGroup[] {
  const groupMap = new Map<number, string[]>();
  const groupOrder: number[] = [];

  for (const block of blocks) {
    if (!groupMap.has(block.groupId)) {
      groupMap.set(block.groupId, []);
      groupOrder.push(block.groupId);
    }
    groupMap.get(block.groupId)!.push(block.content);
  }

  return groupOrder.map((groupId) => ({
    groupId,
    html: groupMap.get(groupId)!.join(""),
  }));
}
