"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { inventorySelect } from "@/app/inventory/inventorySelect";
import { useInventory } from "@/app/inventory/useInventory";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { Button } from "@/style/components/button";
import { Checkbox } from "@/style/components/checkbox";
import { Input } from "@/style/components/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/style/components/sheet";
import { Plus } from "lucide-react";

export function AddManualSheet() {
  const productSingles = useSelector(productSelect.productSingles);
  const productSubs = useSelector(productSelect.productSubs);
  const session = useSelector(inventorySelect.session);
  const { addProduct } = useInventory();

  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState("");

  // Combine singles and subs, exclude already-active products, sort by description
  const allProducts: ProductCommon[] = [...productSingles, ...productSubs]
    .filter((p) => !session.activeProductIds.includes(p.productId))
    .sort((a, b) => a.description.localeCompare(b.description));

  const filtered = filter.trim()
    ? allProducts.filter((p) =>
        p.description.toLowerCase().includes(filter.trim().toLowerCase()),
      )
    : allProducts;

  // Group by category
  const byCategory = new Map<string, ProductCommon[]>();
  for (const product of filtered) {
    const cat = product.category || "Uncategorized";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(product);
  }
  const sortedCategories = Array.from(byCategory.keys()).sort();

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

  const handleAddSelected = () => {
    selectedIds.forEach((id) => addProduct(id));
    setSelectedIds(new Set());
    setFilter("");
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedIds(new Set());
      setFilter("");
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="primary" intensity="soft" size="sm">
          <Plus />
          Manual
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>Add Products</SheetTitle>
        </SheetHeader>

        {/* Search filter */}
        <Input
          type="text"
          placeholder="Search products..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        {/* Grouped product list */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 py-2">
          {sortedCategories.map((category) => (
            <div key={category}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-1">
                {category}
              </p>
              {byCategory.get(category)!.map((product) => {
                const isActive = session.activeProductIds.includes(product.productId);
                const isSelected = selectedIds.has(product.productId);

                return (
                  <label
                    key={product.productId}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/10 cursor-pointer"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleId(product.productId)}
                      disabled={isActive}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">
                        {product.description}
                      </span>
                      {isActive && (
                        <span className="text-xs text-muted-foreground">
                          already added
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No products match &ldquo;{filter}&rdquo;
            </p>
          )}
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
