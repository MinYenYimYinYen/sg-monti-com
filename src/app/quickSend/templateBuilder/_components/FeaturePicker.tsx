"use client";

import React from "react";
import { ScrollArea } from "@/style/components/scroll-area";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { cn } from "@/style/utils";
import { ChevronRight, ChevronLeft, ChevronUp, ChevronDown } from "lucide-react";
import { Checkbox } from "@/style/components/checkbox";
import type { DataFeatureDef, ContentFeatureDef, ContentFeatureKey } from "@/app/quickSend/templates/templateFeatures";
import type { FragmentBlock } from "@/app/quickSend/templates/TemplateTypes";

// ─── Data Feature Picker ────────────────────────────────────────────────────

interface DataFeaturePickerProps {
  available: readonly DataFeatureDef[];
  activeKeys: string[];
  onChange: (keys: string[]) => void;
  title: string;
}

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
    .filter((f): f is DataFeatureDef => f !== undefined);

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
        <DataFeatureList
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
        <DataFeatureList
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
  available: readonly ContentFeatureDef[];
  blocks: FragmentBlock[];
  onChange: (blocks: FragmentBlock[]) => void;
  title: string;
}

const FEATURE_PREFIX: Record<ContentFeatureKey, string> = {
  textLine: "tl",
  paragraph: "p",
};

function generateBlockKey(feature: ContentFeatureKey, existing: FragmentBlock[]): string {
  const prefix = FEATURE_PREFIX[feature];
  const count = existing.filter((b) => b.feature === feature).length + 1;
  return `${prefix}${count}`;
}

function nextId(blocks: FragmentBlock[], field: "choiceId" | "groupId"): number {
  return blocks.length === 0 ? 1 : Math.max(...blocks.map((b) => b[field])) + 1;
}

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
      if (next.has(blockKey)) next.delete(blockKey);
      else next.add(blockKey);
      return next;
    });
  };

  const addBlock = (feature: ContentFeatureKey) => {
    const blockKey = generateBlockKey(feature, blocks);
    const choiceId = nextId(blocks, "choiceId") + blocks.length;
    const groupId = nextId(blocks, "groupId") + blocks.length;
    const newBlock: FragmentBlock = { blockKey, feature, content: "", choiceId, groupId };
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

  // ── Choice actions ──
  const selectedChoiceIds = new Set(selectedBlocks.map((b) => b.choiceId));
  const canCreateChoice = selectedBlocks.length >= 2 && selectedChoiceIds.size > 1;
  const canBreakChoice = selectedBlocks.length >= 2 && selectedChoiceIds.size === 1;

  const createChoice = () => {
    const targetId = Math.min(...selectedBlocks.map((b) => b.choiceId));
    onChange(blocks.map((b) => (selectedKeys.has(b.blockKey) ? { ...b, choiceId: targetId } : b)));
  };

  const breakChoice = () => {
    let next = nextId(blocks, "choiceId");
    onChange(
      blocks.map((b) => {
        if (!selectedKeys.has(b.blockKey)) return b;
        return { ...b, choiceId: next++ };
      }),
    );
    setSelectedKeys(new Set());
  };

  // ── Group actions ──
  const selectedGroupIds = new Set(selectedBlocks.map((b) => b.groupId));
  const canCreateGroup = selectedBlocks.length >= 2 && selectedGroupIds.size > 1;
  const canBreakGroup = selectedBlocks.length >= 2 && selectedGroupIds.size === 1;

  const createGroup = () => {
    const targetId = Math.min(...selectedBlocks.map((b) => b.groupId));
    onChange(blocks.map((b) => (selectedKeys.has(b.blockKey) ? { ...b, groupId: targetId } : b)));
  };

  const breakGroup = () => {
    let next = nextId(blocks, "groupId");
    onChange(
      blocks.map((b) => {
        if (!selectedKeys.has(b.blockKey)) return b;
        return { ...b, groupId: next++ };
      }),
    );
    setSelectedKeys(new Set());
  };

  // ── Reorder (logical units = choice groups) ──
  const toLogicalUnits = (blockList: FragmentBlock[]): FragmentBlock[][] => {
    const units: FragmentBlock[][] = [];
    const seen = new Set<number>();
    for (const block of blockList) {
      if (seen.has(block.choiceId)) continue;
      units.push(blockList.filter((b) => b.choiceId === block.choiceId));
      seen.add(block.choiceId);
    }
    return units;
  };

  const moveUnit = (blockKey: string, direction: "up" | "down") => {
    const units = toLogicalUnits(blocks);
    const unitIndex = units.findIndex((unit) => unit.some((b) => b.blockKey === blockKey));
    if (unitIndex === -1) return;
    const targetIndex = direction === "up" ? unitIndex - 1 : unitIndex + 1;
    if (targetIndex < 0 || targetIndex >= units.length) return;
    const reordered = [...units];
    [reordered[unitIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[unitIndex]];
    onChange(reordered.flat());
  };

  const logicalUnits = toLogicalUnits(blocks);
  const isFirstUnit = (blockKey: string) =>
    logicalUnits[0]?.some((b) => b.blockKey === blockKey) ?? false;
  const isLastUnit = (blockKey: string) =>
    logicalUnits[logicalUnits.length - 1]?.some((b) => b.blockKey === blockKey) ?? false;

  // ── Color coding ──
  // Choice groups: blocks sharing a choiceId (count > 1)
  const choiceIdCounts = blocks.reduce<Record<number, number>>((acc, b) => {
    acc[b.choiceId] = (acc[b.choiceId] ?? 0) + 1;
    return acc;
  }, {});
  const choiceGroupIds = [...new Set(
    blocks.filter((b) => choiceIdCounts[b.choiceId] > 1).map((b) => b.choiceId),
  )].sort((a, b) => a - b);

  // Output groups: blocks sharing a groupId (count > 1)
  const groupIdCounts = blocks.reduce<Record<number, number>>((acc, b) => {
    acc[b.groupId] = (acc[b.groupId] ?? 0) + 1;
    return acc;
  }, {});
  const outputGroupIds = [...new Set(
    blocks.filter((b) => groupIdCounts[b.groupId] > 1).map((b) => b.groupId),
  )].sort((a, b) => a - b);

  const CHOICE_COLORS = ["border-l-primary", "border-l-accent", "border-l-secondary", "border-l-destructive"];
  const GROUP_BG_COLORS = ["bg-primary/5", "bg-accent/5", "bg-secondary/5", "bg-destructive/5"];

  const choiceBorderColor = (choiceId: number): string | null => {
    const idx = choiceGroupIds.indexOf(choiceId);
    return idx === -1 ? null : CHOICE_COLORS[idx % CHOICE_COLORS.length];
  };

  const groupBgColor = (groupId: number): string | null => {
    const idx = outputGroupIds.indexOf(groupId);
    return idx === -1 ? null : GROUP_BG_COLORS[idx % GROUP_BG_COLORS.length];
  };

  const hasChoiceActions = canCreateChoice || canBreakChoice;
  const hasGroupActions = canCreateGroup || canBreakGroup;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
        {title}
      </span>

      <div className="flex flex-wrap gap-1">
        {available.map((feature) => (
          <Button
            key={feature.key}
            size="sm"
            variant="primary"
            intensity="soft"
            onClick={() => addBlock(feature.key as ContentFeatureKey)}
          >
            + {feature.label}
          </Button>
        ))}
      </div>

      {blocks.length > 0 && (
        <ScrollArea className="rounded-md border border-border max-h-48">
          <div className="p-1 space-y-0.5">
            {blocks.map((block) => {
              const def = available.find((f) => f.key === block.feature);
              const isSelected = selectedKeys.has(block.blockKey);
              const choiceColor = choiceBorderColor(block.choiceId);
              const groupBg = groupBgColor(block.groupId);
              const isInChoiceGroup = choiceColor !== null;
              const isInOutputGroup = groupBg !== null;
              // Only the first block in a choice group shows reorder arrows
              const isChoiceGroupLeader =
                !isInChoiceGroup ||
                blocks.find((b) => b.choiceId === block.choiceId)?.blockKey === block.blockKey;

              return (
                <div
                  key={block.blockKey}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded select-none text-sm border-l-2",
                    isSelected ? "bg-primary/10" : isInOutputGroup ? groupBg : "hover:bg-muted/50",
                    isInChoiceGroup ? choiceColor : "border-l-transparent",
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(block.blockKey)}
                  />

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

                  <Input
                    className="h-6 text-xs flex-1 min-w-0"
                    placeholder={block.blockKey}
                    value={block.label ?? ""}
                    onChange={(e) => {
                      const label = e.target.value || undefined;
                      onChange(blocks.map((b) => (b.blockKey === block.blockKey ? { ...b, label } : b)));
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />

                  {isInChoiceGroup && (
                    <span className="text-[10px] text-muted-foreground italic shrink-0">choice</span>
                  )}
                  {isInOutputGroup && (
                    <span className="text-[10px] text-muted-foreground italic shrink-0">group</span>
                  )}

                  {isChoiceGroupLeader && (
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

      {(hasChoiceActions || hasGroupActions) && (
        <div className="flex flex-wrap gap-2">
          {canCreateChoice && (
            <Button size="sm" variant="secondary" intensity="soft" onClick={createChoice}>
              Create Choice
            </Button>
          )}
          {canBreakChoice && (
            <Button size="sm" variant="outline" intensity="ghost" onClick={breakChoice}>
              Break Choice
            </Button>
          )}
          {canCreateGroup && (
            <Button size="sm" variant="accent" intensity="soft" onClick={createGroup}>
              Create Group
            </Button>
          )}
          {canBreakGroup && (
            <Button size="sm" variant="outline" intensity="ghost" onClick={breakGroup}>
              Break Group
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared DataFeatureList ──────────────────────────────────────────────────

interface DataFeatureListProps {
  features: DataFeatureDef[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onDoubleClick: (key: string) => void;
  emptyText: string;
  isActive?: boolean;
}

function DataFeatureList({
  features,
  selectedKey,
  onSelect,
  onDoubleClick,
  emptyText,
  isActive = false,
}: DataFeatureListProps) {
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
