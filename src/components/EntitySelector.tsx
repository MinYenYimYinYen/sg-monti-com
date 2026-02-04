import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { SelectGroup } from "@radix-ui/react-select";
import { cn } from "@/lib/utils";
import { Grouper } from "@/lib/Grouper";

type EntitySelectorProps<TEntity, TId extends string | number> = {
  // Data
  items: TEntity[];

  // Extractors
  getItemId: (entity: TEntity) => TId;
  getItemLabel: (entity: TEntity) => React.ReactNode;

  // Callbacks
  onValueChange?: (id: TId, entity: TEntity) => void;

  // UI Customization
  placeholder?: string;
  triggerClassName?: string;
  contentClassName?: string;
  itemClassName?: string;
  groupClassName?: string;
  variant?: "default" | "shadcnDefault";
};

export default function EntitySelector<TEntity, TId extends string | number>({
  items,
  getItemId,
  getItemLabel,
  onValueChange,
  placeholder = "Select...",
  triggerClassName,
  contentClassName,
  itemClassName,
  groupClassName,
  variant,
}: EntitySelectorProps<TEntity, TId>) {
  const handleValueChange = (value: string) => {
    if (!onValueChange) return;

    // Parse the ID back to its original type
    const parsedId = (
      typeof getItemId(items[0]) === "number" ? Number(value) : value
    ) as TId;

    const itemMap = new Grouper(items).toUniqueMap(getItemId);
    const entity = itemMap.get(parsedId)!;


    if (entity) {
      onValueChange(parsedId, entity);
    }
  };

  return (
    <Select onValueChange={handleValueChange} variant={variant}>
      <SelectTrigger className={cn(triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn(contentClassName)}>
        <SelectGroup className={groupClassName}>
          {items.map((item) => {
            const id = getItemId(item);
            return (
              <SelectItem
                key={String(id)}
                value={String(id)}
                className={itemClassName}
              >
                {getItemLabel(item)}
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
