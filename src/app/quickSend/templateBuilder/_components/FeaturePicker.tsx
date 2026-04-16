"use client";

import React from "react";
import { useSelector } from "react-redux";
import { ScrollArea } from "@/style/components/scroll-area";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Checkbox } from "@/style/components/checkbox";
import { cn } from "@/style/utils";
import { ChevronRight, ChevronLeft, ChevronUp, ChevronDown } from "lucide-react";
import type { DataFeatureDef } from "@/app/quickSend/templates/dataFeatures/dataFeatures";
import type { ContentFeatureDef, ContentFeatureKey } from "@/app/quickSend/templates/contentFeatures/contentFeatures";
import type { FragmentBlock, BlockChoice, BlockGroup } from "@/app/quickSend/templates/TemplateTypes";
import { useTemplateBuilder } from "../useTemplateBuilder";
import { templateBuilderSelect } from "../templateBuilderSelect";

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
  table: "tb",
};

function generateBlockKey(feature: ContentFeatureKey, existing: FragmentBlock[]): string {
  const prefix = FEATURE_PREFIX[feature];
  const count = existing.filter((b) => b.feature === feature).length + 1;
  return `${prefix}${count}`;
}

function nextChoiceId(blocks: FragmentBlock[]): number {
  return blocks.length === 0 ? 1 : Math.max(...blocks.map((b) => b.choice.choiceId)) + 1;
}

function nextGroupId(blocks: FragmentBlock[]): number {
  return blocks.length === 0 ? 1 : Math.max(...blocks.map((b) => b.group.groupId)) + 1;
}

// ─── Nested visual layout helpers ───────────────────────────────────────────

type GroupUnit = {
  group: BlockGroup;
  // Ordered list of choice units within this group
  choiceUnits: ChoiceUnit[];
};

type ChoiceUnit = {
  choice: BlockChoice;
  blocks: FragmentBlock[];
};

function toGroupUnits(blocks: FragmentBlock[]): GroupUnit[] {
  const groupOrder: number[] = [];
  const groupMap = new Map<number, { group: BlockGroup; choiceOrder: number[]; choiceMap: Map<number, { choice: BlockChoice; blocks: FragmentBlock[] }> }>();

  for (const block of blocks) {
    const gid = block.group.groupId;
    const cid = block.choice.choiceId;

    if (!groupMap.has(gid)) {
      groupMap.set(gid, { group: block.group, choiceOrder: [], choiceMap: new Map() });
      groupOrder.push(gid);
    }
    const gEntry = groupMap.get(gid)!;

    if (!gEntry.choiceMap.has(cid)) {
      gEntry.choiceMap.set(cid, { choice: block.choice, blocks: [] });
      gEntry.choiceOrder.push(cid);
    }
    gEntry.choiceMap.get(cid)!.blocks.push(block);
  }

  return groupOrder.map((gid) => {
    const gEntry = groupMap.get(gid)!;
    return {
      group: gEntry.group,
      choiceUnits: gEntry.choiceOrder.map((cid) => gEntry.choiceMap.get(cid)!),
    };
  });
}

function fromGroupUnits(units: GroupUnit[]): FragmentBlock[] {
  return units.flatMap((gu) => gu.choiceUnits.flatMap((cu) => cu.blocks));
}

export function ContentFeaturePicker({
  available,
  blocks,
  onChange,
  title,
}: ContentFeaturePickerProps) {
  const selectedBlockKeySet = useSelector(templateBuilderSelect.selectedBlockKeySet);
  const { toggleBlockSelection, clearBlockSelection } = useTemplateBuilder();

  const addBlock = (feature: ContentFeatureKey) => {
    const blockKey = generateBlockKey(feature, blocks);
    const choiceId = nextChoiceId(blocks) + blocks.length;
    const groupId = nextGroupId(blocks) + blocks.length;
    const newBlock: FragmentBlock = {
      blockKey,
      feature,
      content: "",
      ...(feature === "table"
        ? { tableConfig: { dataSource: "progCode.servCodes", showHeaders: false, columns: [] } }
        : undefined),
      choice: { choiceId },
      group: { groupId },
    };
    onChange([...blocks, newBlock]);
  };

  const removeBlock = (blockKey: string) => {
    onChange(blocks.filter((b) => b.blockKey !== blockKey));
  };

  const updateBlockLabel = (blockKey: string, label: string | undefined) => {
    onChange(blocks.map((b) => (b.blockKey === blockKey ? { ...b, label } : b)));
  };

  const updateGroupLabel = (groupId: number, label: string | undefined) => {
    onChange(
      blocks.map((b) =>
        b.group.groupId === groupId ? { ...b, group: { ...b.group, label } } : b,
      ),
    );
  };

  const updateChoiceLabel = (choiceId: number, label: string | undefined) => {
    onChange(
      blocks.map((b) =>
        b.choice.choiceId === choiceId ? { ...b, choice: { ...b.choice, label } } : b,
      ),
    );
  };

  // ── Group actions ──
  const createGroup = (blockKeys: string[]) => {
    const targetGroupId = Math.min(
      ...blocks.filter((b) => blockKeys.includes(b.blockKey)).map((b) => b.group.groupId),
    );
    const targetLabel = blocks.find((b) => blockKeys.includes(b.blockKey) && b.group.groupId === targetGroupId)?.group.label;
    onChange(
      blocks.map((b) =>
        blockKeys.includes(b.blockKey)
          ? { ...b, group: { groupId: targetGroupId, label: targetLabel } }
          : b,
      ),
    );
  };

  const breakGroup = (groupId: number) => {
    let next = nextGroupId(blocks);
    onChange(
      blocks.map((b) => {
        if (b.group.groupId !== groupId) return b;
        return { ...b, group: { groupId: next++ } };
      }),
    );
  };

  // ── Choice actions ──
  const createChoice = (blockKeys: string[]) => {
    const targetChoiceId = Math.min(
      ...blocks.filter((b) => blockKeys.includes(b.blockKey)).map((b) => b.choice.choiceId),
    );
    const targetLabel = blocks.find((b) => blockKeys.includes(b.blockKey) && b.choice.choiceId === targetChoiceId)?.choice.label;
    onChange(
      blocks.map((b) =>
        blockKeys.includes(b.blockKey)
          ? { ...b, choice: { choiceId: targetChoiceId, label: targetLabel } }
          : b,
      ),
    );
  };

  const breakChoice = (choiceId: number) => {
    let next = nextChoiceId(blocks);
    onChange(
      blocks.map((b) => {
        if (b.choice.choiceId !== choiceId) return b;
        return { ...b, choice: { choiceId: next++ } };
      }),
    );
  };

  // ── Reorder group units ──
  const moveGroupUnit = (groupId: number, direction: "up" | "down") => {
    const units = toGroupUnits(blocks);
    const idx = units.findIndex((u) => u.group.groupId === groupId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= units.length) return;
    const reordered = [...units];
    [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
    onChange(fromGroupUnits(reordered));
  };

  // ── Reorder choice units within a group ──
  const moveChoiceUnit = (groupId: number, choiceId: number, direction: "up" | "down") => {
    const units = toGroupUnits(blocks);
    const gIdx = units.findIndex((u) => u.group.groupId === groupId);
    if (gIdx === -1) return;
    const choiceUnits = units[gIdx].choiceUnits;
    const cIdx = choiceUnits.findIndex((cu) => cu.choice.choiceId === choiceId);
    if (cIdx === -1) return;
    const targetCIdx = direction === "up" ? cIdx - 1 : cIdx + 1;
    if (targetCIdx < 0 || targetCIdx >= choiceUnits.length) return;
    const reorderedChoices = [...choiceUnits];
    [reorderedChoices[cIdx], reorderedChoices[targetCIdx]] = [reorderedChoices[targetCIdx], reorderedChoices[cIdx]];
    const reorderedUnits = [...units];
    reorderedUnits[gIdx] = { ...units[gIdx], choiceUnits: reorderedChoices };
    onChange(fromGroupUnits(reorderedUnits));
  };

  const groupUnits = toGroupUnits(blocks);

  const CHOICE_COLORS = [
    "border-l-primary",
    "border-l-secondary",
    "border-l-destructive",
    "border-l-accent",
  ];

  // Assign a stable color index to each unique choiceId that has 2+ blocks
  const choiceIdCounts = blocks.reduce<Record<number, number>>((acc, b) => {
    acc[b.choice.choiceId] = (acc[b.choice.choiceId] ?? 0) + 1;
    return acc;
  }, {});
  const multiChoiceIds = [...new Set(blocks.filter((b) => choiceIdCounts[b.choice.choiceId] > 1).map((b) => b.choice.choiceId))].sort((a, b) => a - b);
  const choiceColorMap = new Map(multiChoiceIds.map((id, i) => [id, CHOICE_COLORS[i % CHOICE_COLORS.length]]));

  return (
    <div className="flex-1 flex flex-col gap-2 min-h-0">
      <span className="shrink-0 text-xs font-semibold text-foreground/60 uppercase tracking-wide">
        {title}
      </span>

      <div className="shrink-0 flex flex-wrap gap-1">
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

      {/* Selection toolbar - now moved to NodeEditor save area */}

      {groupUnits.length > 0 && (
        <ScrollArea className="flex-1 h-full">
          <div className="space-y-2 pr-1">
            {groupUnits.map((gu, gIdx) => {
              const totalBlocksInGroup = gu.choiceUnits.flatMap((cu) => cu.blocks).length;
              const isTrueGroup = totalBlocksInGroup > 1;
              const isMultiGroup = groupUnits.length > 1;
              const isFirstGroup = gIdx === 0;
              const isLastGroup = gIdx === groupUnits.length - 1;
              const groupId = gu.group.groupId;

              // If single block group, render without group container
              if (!isTrueGroup) {
                return (
                  <React.Fragment key={groupId}>
                    {gu.choiceUnits.map((cu) => {
                      const isChoice = choiceIdCounts[cu.choice.choiceId] > 1;
                      const choiceColor = choiceColorMap.get(cu.choice.choiceId);
                      const choiceId = cu.choice.choiceId;

                      return (
                        <div
                          key={choiceId}
                          className={cn(
                            "rounded border bg-card p-1.5 space-y-1",
                            isChoice ? "border-l-2" : "border-border",
                            isChoice && choiceColor,
                          )}
                        >
                          {/* Choice header (only shown when it's a real choice group) */}
                          {isChoice && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wide shrink-0">
                                Choice
                              </span>
                              <Input
                                className="h-5 text-xs flex-1 min-w-0"
                                placeholder="Choice name (optional)"
                                value={cu.choice.label ?? ""}
                                onChange={(e) => updateChoiceLabel(choiceId, e.target.value || undefined)}
                              />
                              <button
                                className="text-foreground/30 hover:text-destructive text-[10px] font-semibold shrink-0"
                                onClick={() => breakChoice(choiceId)}
                                title="Break choice"
                              >
                                Break
                              </button>
                            </div>
                          )}

                          {/* Blocks within this choice unit */}
                          {cu.blocks.map((block) => {
                            const def = available.find((f) => f.key === block.feature);
                            const isSelected = selectedBlockKeySet.has(block.blockKey);
                            return (
                              <div
                                key={block.blockKey}
                                className={cn(
                                  "flex items-center gap-1.5 px-1 py-0.5 rounded text-sm",
                                  isSelected ? "bg-accent/20" : "hover:bg-muted/40"
                                )}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleBlockSelection(block.blockKey)}
                                  className="shrink-0"
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
                                  onChange={(e) => updateBlockLabel(block.blockKey, e.target.value || undefined)}
                                />

                                <button
                                  className="text-foreground/30 hover:text-destructive text-xs shrink-0"
                                  onClick={() => removeBlock(block.blockKey)}
                                  title="Remove block"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              }

              // Multiple blocks - render full group container
              return (
                <div
                  key={groupId}
                  className="rounded-md border border-border bg-muted/20 p-2 space-y-1.5"
                >
                  {/* Group header */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wide shrink-0">
                      Group
                    </span>
                    <Input
                      className="h-6 text-xs flex-1 min-w-0"
                      placeholder="Group name (optional)"
                      value={gu.group.label ?? ""}
                      onChange={(e) => updateGroupLabel(groupId, e.target.value || undefined)}
                    />
                    {isMultiGroup && (
                      <div className="flex flex-col shrink-0">
                        <button
                          className="text-foreground/30 hover:text-foreground disabled:opacity-20"
                          disabled={isFirstGroup}
                          onClick={() => moveGroupUnit(groupId, "up")}
                          title="Move group up"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          className="text-foreground/30 hover:text-foreground disabled:opacity-20"
                          disabled={isLastGroup}
                          onClick={() => moveGroupUnit(groupId, "down")}
                          title="Move group down"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {isMultiGroup && (
                      <button
                        className="text-foreground/30 hover:text-accent text-[10px] font-semibold shrink-0"
                        onClick={() => breakGroup(groupId)}
                        title="Break group"
                      >
                        Ungroup
                      </button>
                    )}
                  </div>

                  {/* Choice units within this group */}
                  {gu.choiceUnits.map((cu, cIdx) => {
                    const isChoice = choiceIdCounts[cu.choice.choiceId] > 1;
                    const choiceColor = choiceColorMap.get(cu.choice.choiceId);
                    const isFirstChoice = cIdx === 0;
                    const isLastChoice = cIdx === gu.choiceUnits.length - 1;
                    const choiceId = cu.choice.choiceId;

                    return (
                      <div
                        key={choiceId}
                        className={cn(
                          "rounded border bg-card p-1.5 space-y-1",
                          isChoice ? "border-l-2" : "border-border",
                          isChoice && choiceColor,
                        )}
                      >
                        {/* Choice header (only shown when it's a real choice group) */}
                        {isChoice && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wide shrink-0">
                              Choice
                            </span>
                            <Input
                              className="h-5 text-xs flex-1 min-w-0"
                              placeholder="Choice name (optional)"
                              value={cu.choice.label ?? ""}
                              onChange={(e) => updateChoiceLabel(choiceId, e.target.value || undefined)}
                            />
                            <div className="flex flex-col shrink-0">
                              <button
                                className="text-foreground/30 hover:text-foreground disabled:opacity-20"
                                disabled={isFirstChoice}
                                onClick={() => moveChoiceUnit(groupId, choiceId, "up")}
                                title="Move choice up"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                className="text-foreground/30 hover:text-foreground disabled:opacity-20"
                                disabled={isLastChoice}
                                onClick={() => moveChoiceUnit(groupId, choiceId, "down")}
                                title="Move choice down"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                            <button
                              className="text-foreground/30 hover:text-destructive text-[10px] font-semibold shrink-0"
                              onClick={() => breakChoice(choiceId)}
                              title="Break choice"
                            >
                              Break
                            </button>
                          </div>
                        )}

                        {/* Blocks within this choice unit */}
                        {cu.blocks.map((block) => {
                          const def = available.find((f) => f.key === block.feature);
                          const isSelected = selectedBlockKeySet.has(block.blockKey);
                          return (
                            <div
                              key={block.blockKey}
                              className={cn(
                                "flex items-center gap-1.5 px-1 py-0.5 rounded text-sm",
                                isSelected ? "bg-accent/20" : "hover:bg-muted/40"
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleBlockSelection(block.blockKey)}
                                className="shrink-0"
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
                                onChange={(e) => updateBlockLabel(block.blockKey, e.target.value || undefined)}
                              />

                              <button
                                className="text-foreground/30 hover:text-destructive text-xs shrink-0"
                                onClick={() => removeBlock(block.blockKey)}
                                title="Remove block"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ─── Shared DataFeatureList ─────────────────────────────────────────────────

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
