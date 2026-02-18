import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/tailwindUtils";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

type EntityMultiSelectorProps<TEntity, TId extends string | number> = {
  // Data
  items: TEntity[];
  selectedIds?: TId[];

  // Extractors
  getItemId: (entity: TEntity) => TId;
  getItemLabel: (entity: TEntity) => React.ReactNode;

  // Callbacks
  onChange?: (ids: TId[], entities: TEntity[]) => void;

  // UI Customization
  className?: string;
  itemClassName?: string;
  selectedItemClassName?: string;
  placeholder?: string;
};

export default function EntityMultiSelector<
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
                "px-3  cursor-pointer transition-colors",
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
