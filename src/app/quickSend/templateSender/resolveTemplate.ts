import type { FragmentBlock, TableConfig } from "@/app/quickSend/templates/TemplateTypes";
import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type { GlobalSettings } from "@/app/globalSettings/_lib/GlobalSettingsTypes";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
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
  /** True if this group was generated from a table block (not editable in Tiptap). */
  isTable?: boolean;
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
  progCode: ProgCode | null = null,
): ResolvedGroup[] {
  // Step 1: resolve choices
  const choiceWinners = resolveChoices(blocks, activeChoices);

  // Step 2: resolve content per block
  const resolved = choiceWinners.map((block) => {
    if (block.feature === "table") {
      return {
        ...block,
        content: block.tableConfig ? buildTableHtml(block.tableConfig, progCode) : "",
      };
    }
    return {
      ...block,
      content: resolveVariables(block.content, customer, globalSettings, progCode),
    };
  });

  // Step 3: group by groupId in first-occurrence order
  return buildGroups(resolved, choiceWinners);
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
  progCode: ProgCode | null = null,
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
    if (id.startsWith("globalSettings.")) {
      const key = id.slice("globalSettings.".length);
      return replaceGlobalSettings(key);
    }
    if (id.startsWith("progCode.")) {
      const key = id.slice("progCode.".length);
      if (progCode && key in progCode) {
        return String(progCode[key as keyof typeof progCode] ?? "");
      }
      return `[${key}]`;
    }
    // Otherwise it's a customer variable key like "displayName"
    return replaceCustomer(id);
  };

  return html
    .replace(MENTION_SPAN_RE, replaceMentionSpan)
    .replace(PLAIN_CUSTOMER_VAR_RE, (_match, key: string) => replaceCustomer(key))
    .replace(PLAIN_GLOBAL_SETTINGS_VAR_RE, (_match, key: string) => replaceGlobalSettings(key));
}

// ─── Table HTML generation ───────────────────────────────────────────────────

function buildTableHtml(tableConfig: TableConfig, progCode: ProgCode | null): string {
  if (!progCode) {
    return '<p style="color: #888; font-style: italic;">[Select a program to populate this table]</p>';
  }

  const { columns, showHeaders } = tableConfig;
  if (columns.length === 0) {
    return '<p style="color: #888; font-style: italic;">[No columns configured]</p>';
  }

  const servCodes = progCode.servCodes.filter((s) => s.available && !s.isServiceCall);

  let html = '<table style="border-collapse: collapse; width: 100%;">';

  if (showHeaders) {
    html += "<thead><tr>";
    for (const col of columns) {
      const headerText = col.header ?? col.field;
      html += `<th style="border: 1px solid #ccc; padding: 4px 8px; text-align: left; background: #f5f5f5;">${escapeHtml(headerText)}</th>`;
    }
    html += "</tr></thead>";
  }

  html += "<tbody>";
  for (const servCode of servCodes) {
    html += "<tr>";
    for (const col of columns) {
      const value = String((servCode as unknown as Record<string, unknown>)[col.field] ?? "");
      html += `<td style="border: 1px solid #ccc; padding: 4px 8px;">${escapeHtml(value)}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Group assembly ──────────────────────────────────────────────────────────

/**
 * Groups resolved blocks by groupId.
 * `originalBlocks` is used to determine if a group contains any table blocks
 * (so the sender can render it as plain HTML instead of Tiptap).
 */
function buildGroups(resolvedBlocks: FragmentBlock[], originalBlocks: FragmentBlock[]): ResolvedGroup[] {
  const groupMap = new Map<number, string[]>();
  const groupLabelMap = new Map<number, string | undefined>();
  const firstBlockLabelMap = new Map<number, string | undefined>();
  const groupIsTableMap = new Map<number, boolean>();
  const groupOrder: number[] = [];

  for (let i = 0; i < resolvedBlocks.length; i++) {
    const block = resolvedBlocks[i];
    const originalBlock = originalBlocks[i];
    const { groupId, label } = block.group;
    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, []);
      groupLabelMap.set(groupId, label);
      firstBlockLabelMap.set(groupId, block.label);
      groupIsTableMap.set(groupId, false);
      groupOrder.push(groupId);
    }
    groupMap.get(groupId)!.push(block.content);
    // Mark group as table if any block in it is a table block
    if (originalBlock.feature === "table") {
      groupIsTableMap.set(groupId, true);
    }
  }

  return groupOrder.map((groupId) => {
    const groupLabel = groupLabelMap.get(groupId);
    const firstBlockLabel = firstBlockLabelMap.get(groupId);
    const isTable = groupIsTableMap.get(groupId) ?? false;
    return {
      groupId,
      label: groupLabel ?? firstBlockLabel,
      html: groupMap.get(groupId)!.join(""),
      ...(isTable ? { isTable: true } : undefined),
    };
  });
}
