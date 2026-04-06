import { useState } from "react";
import { useSelector } from "react-redux";
import { quickSendSelect } from "@/app/quickSend/quickSendSelect";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { resolveTemplate, type ResolvedGroup } from "./resolveTemplate";
import type { TreeNodeDoc, FragmentBlock } from "@/app/quickSend/templates/TemplateTypes";

export type SenderState = {
  /** Active blockKey per choiceId. Only populated for choiceIds with 2+ blocks. */
  activeChoices: Record<number, string>;
  setChoice: (choiceId: number, blockKey: string) => void;
  /** Resolved output groups, ready to render. */
  resolvedGroups: ResolvedGroup[];
  /** True if any choiceId has 2+ blocks (i.e. the user needs to make a selection). */
  hasChoices: boolean;
};

/**
 * Manages send-time state for a single fragment.
 * Initializes active choices to the first block per choiceId,
 * and derives resolved output groups whenever choices, customer, or globalSettings change.
 */
export function useSenderState(
  fragment: TreeNodeDoc["fragment"] | undefined,
): SenderState {
  const customer = useSelector(quickSendSelect.customer);
  const globalSettings = useSelector(globalSettingsSelect.settings);
  const blocks: FragmentBlock[] = fragment?.blocks ?? [];

  // Build the initial active choices: first block per choiceId that has 2+ blocks
  const initialChoices = buildInitialChoices(blocks);
  const [activeChoices, setActiveChoices] = useState<Record<number, string>>(initialChoices);

  const setChoice = (choiceId: number, blockKey: string) => {
    setActiveChoices((prev) => ({ ...prev, [choiceId]: blockKey }));
  };

  const resolvedGroups = resolveTemplate(blocks, activeChoices, customer, globalSettings);

  const hasChoices = Object.keys(initialChoices).length > 0;

  return { activeChoices, setChoice, resolvedGroups, hasChoices };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildInitialChoices(blocks: FragmentBlock[]): Record<number, string> {
  const choiceIdCounts = blocks.reduce<Record<number, number>>((acc, b) => {
    acc[b.choice.choiceId] = (acc[b.choice.choiceId] ?? 0) + 1;
    return acc;
  }, {});

  const choices: Record<number, string> = {};
  const seen = new Set<number>();

  for (const block of blocks) {
    const choiceId = block.choice.choiceId;
    if (choiceIdCounts[choiceId] > 1 && !seen.has(choiceId)) {
      choices[choiceId] = block.blockKey;
      seen.add(choiceId);
    }
  }

  return choices;
}
