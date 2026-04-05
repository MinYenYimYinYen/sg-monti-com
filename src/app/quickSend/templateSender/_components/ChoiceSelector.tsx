"use client";

import React from "react";
import { cn } from "@/style/utils";
import type { FragmentBlock } from "@/app/quickSend/templates/TemplateTypes";

interface ChoiceSelectorProps {
  blocks: FragmentBlock[];
  activeChoices: Record<number, string>;
  setChoice: (choiceId: number, blockKey: string) => void;
}

/**
 * Renders a toggle-button row for each choiceId that has 2+ blocks.
 * The user picks one option per choice group; the active selection is highlighted.
 */
export function ChoiceSelector({ blocks, activeChoices, setChoice }: ChoiceSelectorProps) {
  // Build choice groups: only choiceIds with 2+ blocks
  const choiceGroups = buildChoiceGroups(blocks);

  if (choiceGroups.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {choiceGroups.map(({ choiceId, options }) => (
        <div key={choiceId} className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
            Choose one
          </span>
          <div className="flex flex-wrap gap-1">
            {options.map((block) => {
              const isActive = activeChoices[choiceId] === block.blockKey;
              return (
                <button
                  key={block.blockKey}
                  onClick={() => setChoice(choiceId, block.blockKey)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground/70 border-border hover:bg-primary/10 hover:text-foreground",
                  )}
                >
                  {block.label ?? block.blockKey}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ChoiceGroup = {
  choiceId: number;
  options: FragmentBlock[];
};

function buildChoiceGroups(blocks: FragmentBlock[]): ChoiceGroup[] {
  const choiceIdCounts = blocks.reduce<Record<number, number>>((acc, b) => {
    acc[b.choiceId] = (acc[b.choiceId] ?? 0) + 1;
    return acc;
  }, {});

  const groups: ChoiceGroup[] = [];
  const seen = new Set<number>();

  for (const block of blocks) {
    if (choiceIdCounts[block.choiceId] > 1 && !seen.has(block.choiceId)) {
      groups.push({
        choiceId: block.choiceId,
        options: blocks.filter((b) => b.choiceId === block.choiceId),
      });
      seen.add(block.choiceId);
    }
  }

  return groups;
}
