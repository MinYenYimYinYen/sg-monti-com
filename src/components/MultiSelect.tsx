"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/tailwindUtils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/style/components/collapsible";
import { Button } from "@/style/components/button";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

// Base props shared by both components
type MultiSelectorBaseProps<TEntity, TId extends string | number> = {
  // Data
  items: TEntity[];
  selectedIds?: TId[];

  // Extractors
  getItemId: (entity: TEntity) => TId;
  getItemLabel: (entity: TEntity) => React.ReactNode;

  // Callbacks
  onChange?: (ids: TId[], entities: TEntity[]) => void;

  // UI Customization
  placeholder?: string;
};

// EntityMultiSelector-specific props
type EntityMultiSelectorProps<TEntity, TId extends string | number> =
  MultiSelectorBaseProps<TEntity, TId> & {
    className?: string;
    itemClassName?: string;
    selectedItemClassName?: string;
  };

// CollapsibleMultiSelector-specific props
type CollapsibleMultiSelectorProps<TEntity, TId extends string | number> =
  MultiSelectorBaseProps<TEntity, TId> & {
    getTriggerLabel?: (entity: TEntity) => string;
    triggerClassName?: string;
    popoverClassName?: string;
    selectorClassName?: string;
  };

// ConditionalMultiSelector-specific props
type ConditionalMultiSelectorProps<TEntity, TId extends string | number> =
  MultiSelectorBaseProps<TEntity, TId> & {
    collapsible: boolean;
    getTriggerLabel?: (entity: TEntity) => string;
    triggerClassName?: string;
    popoverClassName?: string;
    className?: string;
    itemClassName?: string;
    selectedItemClassName?: string;
  };

export function EntityMultiSelector<
  TEntity,
  TId extends string | number,
>({
  items,
  selectedIds = [],
  getItemId,
  getItemLabel,
  onChange,
  className,
  itemClassName,
  selectedItemClassName,
  placeholder = "Select items...",
}: EntityMultiSelectorProps<TEntity, TId>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const itemMap = new Grouper(items).toUniqueMap(getItemId);
  const selectedIdsSet = new Set(selectedIds);

  const handleToggle = (id: TId) => {
    if (!onChange) return;

    const newSelectedIds = selectedIdsSet.has(id)
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id];

    const newSelectedEntities = newSelectedIds
      .map((id) => itemMap.get(id))
      .filter((entity): entity is TEntity => entity !== undefined);

    onChange(newSelectedIds, newSelectedEntities);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (items.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, items.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          handleToggle(getItemId(items[focusedIndex]));
        }
        break;
    }
  };

  // Auto-scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [focusedIndex]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-y-auto border rounded-md bg-background",
        className,
      )}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {items.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">
          {placeholder}
        </div>
      ) : (
        items.map((item, index) => {
          const id = getItemId(item);
          const isSelected = selectedIdsSet.has(id);
          const isFocused = index === focusedIndex;

          return (
            <div
              key={String(id)}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              onClick={() => handleToggle(id)}
              onMouseEnter={() => setFocusedIndex(index)}
              className={cn(
                "px-3 cursor-pointer transition-colors",
                "hover:bg-accent/50 hover:text-accent-foreground",
                isFocused && "bg-accent/30",
                isSelected
                  ? cn(
                      "bg-primary/30 font-medium border-l-4 border-primary",
                      selectedItemClassName,
                    )
                  : "border-l-4 border-transparent",
                itemClassName,
              )}
            >
              {getItemLabel(item)}
            </div>
          );
        })
      )}
    </div>
  );
}
export function CollapsibleMultiSelector<
  TEntity,
  TId extends string | number,
>({
  items,
  selectedIds = [],
  getItemId,
  getItemLabel,
  getTriggerLabel,
  onChange,
  placeholder = "none",
  triggerClassName,
  popoverClassName,
  selectorClassName,
}: CollapsibleMultiSelectorProps<TEntity, TId>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build map for quick lookup
  const itemMap = new Map(items.map((item) => [getItemId(item), item]));
  const selectedEntities = selectedIds
    .map((id) => itemMap.get(id))
    .filter((entity): entity is TEntity => entity !== undefined);

  // Generate trigger label
  const triggerText =
    selectedEntities.length > 0
      ? selectedEntities
          .map((entity) =>
            getTriggerLabel ? getTriggerLabel(entity) : getItemId(entity),
          )
          .join(", ")
      : placeholder;

  // Click outside to close
  // @ts-expect-error Ok that not all paths return in this case
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <Collapsible
      ref={containerRef}
      open={isOpen}
      onOpenChange={setIsOpen}
      className="relative"
    >
      <CollapsibleTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "capitalize flex items-center justify-center",
            triggerClassName,
          )}
        >
          {triggerText}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "absolute right-0 top-full z-50 mt-2 rounded-md border bg-popover p-4 shadow-md",
          popoverClassName,
        )}
      >
        <EntityMultiSelector
          items={items}
          getItemId={getItemId}
          getItemLabel={getItemLabel}
          selectedIds={selectedIds}
          onChange={onChange}
          className={selectorClassName}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

export function MultiSelect<
  TEntity,
  TId extends string | number,
>({
  collapsible,
  items,
  selectedIds = [],
  getItemId,
  getItemLabel,
  getTriggerLabel,
  onChange,
  placeholder = "none",
  triggerClassName,
  popoverClassName,
  className,
  itemClassName,
  selectedItemClassName,
}: ConditionalMultiSelectorProps<TEntity, TId>) {
  if (collapsible) {
    return (
      <CollapsibleMultiSelector
        items={items}
        selectedIds={selectedIds}
        getItemId={getItemId}
        getItemLabel={getItemLabel}
        getTriggerLabel={getTriggerLabel}
        onChange={onChange}
        placeholder={placeholder}
        triggerClassName={triggerClassName}
        popoverClassName={popoverClassName}
        selectorClassName={className}
      />
    );
  }

  return (
    <EntityMultiSelector
      items={items}
      selectedIds={selectedIds}
      getItemId={getItemId}
      getItemLabel={getItemLabel}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      itemClassName={itemClassName}
      selectedItemClassName={selectedItemClassName}
    />
  );
}
