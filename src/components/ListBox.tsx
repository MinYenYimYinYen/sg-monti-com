import React, { useState, useMemo } from "react";
import { ScrollArea } from "@/style/components/scroll-area";
import { Checkbox } from "@/style/components/checkbox";
import { Input } from "@/style/components/input";
import { cn } from "@/style/utils";

export interface ListBoxProps<T, K extends string | number> {
  items: T[];
  selectedKeys: K[];
  onSelectionChange: (keys: K[]) => void;
  keyExtractor: (item: T) => K;
  renderItem: (item: T) => React.ReactNode;
  enableFilter?: boolean;
  filterPlaceholder?: string;
  filterFn?: (item: T, filterText: string) => boolean;
  className?: string;
}

export function ListBox<T, K extends string | number>({
  items,
  selectedKeys,
  onSelectionChange,
  keyExtractor,
  renderItem,
  enableFilter = false,
  filterPlaceholder = "Filter...",
  filterFn,
  className,
}: ListBoxProps<T, K>) {
  const [filter, setFilter] = useState("");

  const filteredItems = useMemo(() => {
    if (!enableFilter || !filter) return items;
    if (filterFn) return items.filter((item) => filterFn(item, filter));

    // Default fallback filter: check if stringified item contains filter
    const lowerFilter = filter.toLowerCase();
    return items.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(lowerFilter)
    );
  }, [items, filter, enableFilter, filterFn]);

  const toggleItem = (key: K) => {
    onSelectionChange(
      selectedKeys.includes(key)
        ? selectedKeys.filter((k) => k !== key)
        : [...selectedKeys, key]
    );
  };

  return (
    <div className={cn("h-full flex flex-col gap-2", className)}>
      {enableFilter && (
        <Input
          placeholder={filterPlaceholder}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      <ScrollArea className={"flex-1 rounded-md border"}>
        <div className="p-2 space-y-1">
          {filteredItems.map((item) => {
            const key = keyExtractor(item);
            const isSelected = selectedKeys.includes(key);
            return (
              <div
                key={key}
                className="flex items-center space-x-2 rounded-md border p-2 hover:bg-accent/10 cursor-pointer"
                onClick={() => toggleItem(key)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleItem(key)}
                />
                <div className="flex-1 overflow-hidden">
                  {renderItem(item)}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
