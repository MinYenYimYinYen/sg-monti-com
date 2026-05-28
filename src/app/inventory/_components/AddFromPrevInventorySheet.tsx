"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { inventorySelect } from "@/app/inventory/inventorySelect";
import { useInventory } from "@/app/inventory/useInventory";
import { Button } from "@/style/components/button";
import { Checkbox } from "@/style/components/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/style/components/sheet";
import { History } from "lucide-react";

export function AddFromPrevInventorySheet() {
  const lastCheck = useSelector(inventorySelect.hydratedChecks)[0];
  const session = useSelector(inventorySelect.session);
  const { addProduct } = useInventory();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  if (!lastCheck || lastCheck.entries.length === 0) return null;

  const entriesWithQty = lastCheck.entries.filter((e) => e.totalCount > 0);

  const toggleId = (productId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleAddAll = () => {
    entriesWithQty.forEach((entry) => addProduct(entry.productId));
    setOpen(false);
  };

  const handleAddSelected = () => {
    selectedIds.forEach((id) => addProduct(id));
    setSelectedIds(new Set());
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) setSelectedIds(new Set());
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="secondary" intensity="soft" size="sm">
          <History />
          Prev. Inv
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>Previous Inventory ({lastCheck.checkDate})</SheetTitle>
        </SheetHeader>

        {/* Add all button */}
        <Button
          variant="accent"
          intensity="soft"
          className="w-full"
          onClick={handleAddAll}
        >
          Add all Qty &gt; 0 ({entriesWithQty.length} products)
        </Button>

        {/* Multi-select list */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-1 py-2">
          {entriesWithQty.map((entry) => {
            const isActive = session.activeProductIds.includes(entry.productId);
            const isSelected = selectedIds.has(entry.productId);
            const displayTotal = entry.product.unitConfigDisplay.format({
              amount: entry.totalCount,
              targetContexts: ["load", "app"],
            });

            return (
              <label
                key={entry.productId}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/10 cursor-pointer"
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleId(entry.productId)}
                  disabled={isActive}
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">
                    {entry.product.description}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {displayTotal.formattedString}
                    {isActive && " · already added"}
                  </span>
                </div>
              </label>
            );
          })}
        </div>

        <SheetFooter>
          <Button
            variant="primary"
            intensity="solid"
            className="w-full"
            disabled={selectedIds.size === 0}
            onClick={handleAddSelected}
          >
            Add Selected ({selectedIds.size})
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
