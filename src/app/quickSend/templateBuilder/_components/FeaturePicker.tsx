"use client";

import React from "react";
import { ScrollArea } from "@/style/components/scroll-area";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { cn } from "@/style/utils";
import { ChevronRight, ChevronLeft, ChevronUp, ChevronDown } from "lucide-react";
import { Checkbox } from "@/style/components/checkbox";
import type { TemplateFeatureDef, TemplateFeatureKey } from "@/app/quickSend/templates/templateFeatures";
import type { FragmentBlock } from "@/app/quickSend/templates/TemplateTypes";

// ─── Data Feature Picker ────────────────────────────────────────────────────

interface DataFeaturePickerProps {
  available: readonly TemplateFeatureDef[];
  activeKeys: string[];
  onChange: (keys: string[]) => void;
  title: string;
}

/**
 * Dual-listbox for data features (no slot numbers — just active/inactive).
 */
export function DataFeaturePicker({
  available,
  activeKeys,
  onChange,
  title,
}: DataFeaturePickerProps) {
  const [leftSelected, setLeftSelected] = React.useState<string | null>(null);
  const [rightSelected, setRightSelected] = React.useState<string | null>(null);

  const inactiveFeatures = available.filter((f) => !activeKeys.includes(f.key));
  const activeFeatures = activeKeys
    .map((key) => available.find((f) => f.key === key))
    .filter((f): f is TemplateFeatureDef => f !== undefined);

  const moveToActive = (key: string) => {
    if (activeKeys.includes(key)) return;
    onChange([...activeKeys, key]);
    setLeftSelected(null);
  };

  const moveToInactive = (key: string) => {
    onChange(activeKeys.filter((k) => k !== key));
    setRightSelected(null);
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
        {title}
      </span>
      <div className="flex gap-2 items-center h-28">
        <FeatureList
          features={inactiveFeatures}
          selectedKey={leftSelected}
          onSelect={setLeftSelected}
          onDoubleClick={moveToActive}
          emptyText="All selected"
        />
        <div className="flex flex-col gap-1 shrink-0">
          <Button
            size="icon"
            variant="primary"
            intensity="soft"
            disabled={!leftSelected}
            onClick={() => leftSelected && moveToActive(leftSelected)}
            title="Add"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            intensity="ghost"
            disabled={!rightSelected}
            onClick={() => rightSelected && moveToInactive(rightSelected)}
            title="Remove"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <FeatureList
          features={activeFeatures}
          selectedKey={rightSelected}
          onSelect={setRightSelected}
          onDoubleClick={moveToInactive}
          emptyText="None selected"
          isActive
        />
      </div>
    </div>
  );
}

// ─── Content Feature Picker ─────────────────────────────────────────────────

interface ContentFeaturePickerProps {
  available: readonly TemplateFeatureDef[];
  blocks: FragmentBlock[];
  onChange: (blocks: FragmentBlock[]) => void;
  title: string;
}

/** Abbreviation prefix for blockKey generation, keyed by feature. */
const FEATURE_PREFIX: Record<TemplateFeatureKey, string> = {
  custIdSearch: "cis",
  textLine: "tl",
  paragraph: "p",
};

function generateBlockKey(feature: TemplateFeatureKey, existing: FragmentBlock[]): string {
  const prefix = FEATURE_PREFIX[feature];
  const count = existing.filter((b) => b.feature === feature).length + 1;
  return `${prefix}${count}`;
}

function nextBlockId(blocks: FragmentBlock[]): number {
  return blocks.length === 0 ? 1 : Math.max(...blocks.map((b) => b.blockId)) + 1;
}

/**
 * Content block manager.
 * Left side: add buttons for each available feature type.
 * Right side: ordered list of active blocks with multi-select + Create/Break Choice.
 * Slot numbers (blockId) and blockKeys are never shown to the user.
 */
export function ContentFeaturePicker({
  available,
  blocks,
  onChange,
  title,
}: ContentFeaturePickerProps) {
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set());

  const toggleSelect = (blockKey: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(blockKey)) {
        next.delete(blockKey);
      } else {
        next.add(blockKey);
      }
      return next;
    });
  };

  const addBlock = (feature: TemplateFeatureKey) => {
    const blockKey = generateBlockKey(feature, blocks);
    const blockId = nextBlockId(blocks);
    const newBlock: FragmentBlock = { blockKey, feature, content: "", blockId };
    onChange([...blocks, newBlock]);
  };

  const removeBlock = (blockKey: string) => {
    onChange(blocks.filter((b) => b.blockKey !== blockKey));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.delete(blockKey);
      return next;
    });
  };

  const selectedBlocks = blocks.filter((b) => selectedKeys.has(b.blockKey));
  const selectedBlockIds = new Set(selectedBlocks.map((b) => b.blockId));

  // "Create Choice": 2+ selected, not all already in the same group
  const canCreateChoice =
    selectedBlocks.length >= 2 && selectedBlockIds.size > 1;

  // "Break Choice": 2+ selected, all in the same group
  const canBreakChoice =
    selectedBlocks.length >= 2 && selectedBlockIds.size === 1;

  const createChoice = () => {
    const targetId = Math.min(...selectedBlocks.map((b) => b.blockId));
    // Assign same blockId and make selected blocks adjacent (grouped together)
    const groupedBlocks = selectedBlocks.map((b) => ({ ...b, blockId: targetId }));
    const otherBlocks = blocks.filter((b) => !selectedKeys.has(b.blockKey));
    // Insert the group at the position of the first selected block in the original array
    const firstSelectedIndex = blocks.findIndex((b) => selectedKeys.has(b.blockKey));
    const result = [
      ...otherBlocks.slice(0, firstSelectedIndex - (blocks.slice(0, firstSelectedIndex).filter((b) => selectedKeys.has(b.blockKey)).length)),
      ...groupedBlocks,
      ...otherBlocks.slice(firstSelectedIndex - (blocks.slice(0, firstSelectedIndex).filter((b) => selectedKeys.has(b.blockKey)).length)),
    ];
    onChange(result);
  };

  const breakChoice = () => {
    let nextId = nextBlockId(blocks.filter((b) => !selectedKeys.has(b.blockKey)));
    onChange(
      blocks.map((b) => {
        if (!selectedKeys.has(b.blockKey)) return b;
        return { ...b, blockId: nextId++ };
      }),
    );
    setSelectedKeys(new Set());
  };

  /**
   * Builds a list of logical units for reordering.
   * Each unit is an array of blocks sharing the same blockId (choice group),
   * or a single-element array for standalone blocks.
   * Units preserve the order of their first occurrence in the blocks array.
   */
  const toLogicalUnits = (blockList: FragmentBlock[]): FragmentBlock[][] => {
    const units: FragmentBlock[][] = [];
    const seen = new Set<number>();
    for (const block of blockList) {
      if (seen.has(block.blockId)) continue;
      const group = blockList.filter((b) => b.blockId === block.blockId);
      units.push(group);
      seen.add(block.blockId);
    }
    return units;
  };

  const moveUnit = (blockKey: string, direction: "up" | "down") => {
    const units = toLogicalUnits(blocks);
    const unitIndex = units.findIndex((unit) =>
      unit.some((b) => b.blockKey === blockKey),
    );
    if (unitIndex === -1) return;
    const targetIndex = direction === "up" ? unitIndex - 1 : unitIndex + 1;
    if (targetIndex < 0 || targetIndex >= units.length) return;
    const reordered = [...units];
    [reordered[unitIndex], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[unitIndex],
    ];
    onChange(reordered.flat());
  };

  // Logical units for determining first/last position (for disabling ↑/↓)
  const logicalUnits = toLogicalUnits(blocks);

  const isFirstUnit = (blockKey: string) =>
    logicalUnits[0]?.some((b) => b.blockKey === blockKey) ?? false;

  const isLastUnit = (blockKey: string) =>
    logicalUnits[logicalUnits.length - 1]?.some((b) => b.blockKey === blockKey) ??
    false;

  // Group blocks by blockId to determine choice groups
  const blockIdCounts = blocks.reduce<Record<number, number>>((acc, b) => {
    acc[b.blockId] = (acc[b.blockId] ?? 0) + 1;
    return acc;
  }, {});

  // Assign a stable color index to each choice group (blockId with count > 1)
  const choiceGroupIds = [...new Set(
    blocks.filter((b) => blockIdCounts[b.blockId] > 1).map((b) => b.blockId),
  )].sort((a, b) => a - b);

  const choiceGroupColor = (blockId: number): string | null => {
    const idx = choiceGroupIds.indexOf(blockId);
    if (idx === -1) return null;
    const colors = [
      "border-l-primary",
      "border-l-accent",
      "border-l-secondary",
      "border-l-destructive",
    ];
    return colors[idx % colors.length];
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
        {title}
      </span>

      {/* Add buttons */}
      <div className="flex flex-wrap gap-1">
        {available.map((feature) => (
          <Button
            key={feature.key}
            size="sm"
            variant="primary"
            intensity="soft"
            onClick={() => addBlock(feature.key)}
          >
            + {feature.label}
          </Button>
        ))}
      </div>

      {/* Active blocks list */}
      {blocks.length > 0 && (
        <ScrollArea className="rounded-md border border-border max-h-48">
          <div className="p-1 space-y-0.5">
            {blocks.map((block) => {
              const def = available.find((f) => f.key === block.feature);
              const isSelected = selectedKeys.has(block.blockKey);
              const groupColor = choiceGroupColor(block.blockId);
              const isInChoiceGroup = groupColor !== null;

              return (
                <div
                  key={block.blockKey}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded select-none text-sm border-l-2",
                    isSelected ? "bg-primary/10" : "hover:bg-muted/50",
                    isInChoiceGroup ? groupColor : "border-l-transparent",
                  )}
                >
                  {/* Checkbox — sole selection trigger */}
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(block.blockKey)}
                  />

                  {/* Feature type badge */}
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1 rounded shrink-0",
                      block.feature === "paragraph"
                        ? "bg-accent/20 text-accent"
                        : "bg-primary/20 text-primary",
                    )}
                  >
                    {def?.label ?? block.feature}
                  </span>

                  {/* User-defined name input */}
                  <Input
                    className="h-6 text-xs flex-1 min-w-0"
                    placeholder={block.blockKey}
                    value={block.label ?? ""}
                    onChange={(e) => {
                      const label = e.target.value || undefined;
                      onChange(
                        blocks.map((b) =>
                          b.blockKey === block.blockKey ? { ...b, label } : b,
                        ),
                      );
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />

                  {isInChoiceGroup && (
                    <span className="text-[10px] text-muted-foreground italic shrink-0">
                      choice
                    </span>
                  )}

                  {/* Reorder buttons — only first member of a group shows them */}
                  {(!isInChoiceGroup ||
                    blocks.find((b) => b.blockId === block.blockId)?.blockKey ===
                      block.blockKey) && (
                    <div className="flex flex-col shrink-0">
                      <button
                        className="text-foreground/30 hover:text-foreground disabled:opacity-20"
                        disabled={isFirstUnit(block.blockKey)}
                        onClick={() => moveUnit(block.blockKey, "up")}
                        title="Move up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        className="text-foreground/30 hover:text-foreground disabled:opacity-20"
                        disabled={isLastUnit(block.blockKey)}
                        onClick={() => moveUnit(block.blockKey, "down")}
                        title="Move down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <button
                    className="text-foreground/30 hover:text-destructive text-xs shrink-0"
                    onClick={() => removeBlock(block.blockKey)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Choice actions */}
      {(canCreateChoice || canBreakChoice) && (
        <div className="flex gap-2">
          {canCreateChoice && (
            <Button
              size="sm"
              variant="secondary"
              intensity="soft"
              onClick={createChoice}
            >
              Create Choice
            </Button>
          )}
          {canBreakChoice && (
            <Button
              size="sm"
              variant="outline"
              intensity="ghost"
              onClick={breakChoice}
            >
              Break Choice
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared FeatureList ──────────────────────────────────────────────────────

interface FeatureListProps {
  features: TemplateFeatureDef[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onDoubleClick: (key: string) => void;
  emptyText: string;
  isActive?: boolean;
}

function FeatureList({
  features,
  selectedKey,
  onSelect,
  onDoubleClick,
  emptyText,
  isActive = false,
}: FeatureListProps) {
  return (
    <ScrollArea className="flex-1 h-full rounded-md border border-border">
      <div className="p-1 space-y-0.5">
        {features.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-1">{emptyText}</p>
        ) : (
          features.map((feature) => (
            <div
              key={feature.key}
              className={cn(
                "flex flex-col px-2 py-1 rounded cursor-pointer select-none text-sm",
                selectedKey === feature.key
                  ? isActive
                    ? "bg-accent/20 text-foreground"
                    : "bg-primary/20 text-foreground"
                  : "hover:bg-muted/50 text-foreground/80",
              )}
              onClick={() => onSelect(feature.key)}
              onDoubleClick={() => onDoubleClick(feature.key)}
            >
              <span className="font-medium">{feature.label}</span>
              <span className="text-xs text-muted-foreground leading-tight">
                {feature.description}
              </span>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
