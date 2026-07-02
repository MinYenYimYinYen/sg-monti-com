"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { inventorySelect } from "@/app/inventory/inventorySelect";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { useInventory } from "@/app/inventory/useInventory";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { Button } from "@/style/components/button";
import { Checkbox } from "@/style/components/checkbox";
import { Input } from "@/style/components/input";
import { DateRangePicker } from "@/components/DateRangePicker";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/style/components/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/style/components/tabs";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { PackageSearch, Search } from "lucide-react";

// ---------------------------------------------------------------------------
// Select All / None control
// ---------------------------------------------------------------------------

type SelectAllNoneProps = {
  products: ProductCommon[];
  activeProductIds: number[];
  selectedIds: Set<number>;
  onBulkSelect: (ids: number[], selected: boolean) => void;
};

function SelectAllNone({ products, activeProductIds, selectedIds, onBulkSelect }: SelectAllNoneProps) {
  const selectable = products.filter((p) => !activeProductIds.includes(p.productId));
  if (selectable.length === 0) return null;

  const allSelected = selectable.every((p) => selectedIds.has(p.productId));
  const ids = selectable.map((p) => p.productId);

  return (
    <div className="flex items-center gap-2 px-3 py-1 shrink-0">
      <span className="text-xs text-muted-foreground">Select:</span>
      <button
        type="button"
        onClick={() => onBulkSelect(ids, true)}
        disabled={allSelected}
        className="text-xs text-primary underline-offset-2 hover:underline disabled:opacity-40 disabled:no-underline"
      >
        All
      </button>
      <span className="text-xs text-muted-foreground">·</span>
      <button
        type="button"
        onClick={() => onBulkSelect(ids, false)}
        disabled={!selectable.some((p) => selectedIds.has(p.productId))}
        className="text-xs text-primary underline-offset-2 hover:underline disabled:opacity-40 disabled:no-underline"
      >
        None
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared product list with checkboxes
// ---------------------------------------------------------------------------

type ProductCheckListProps = {
  products: ProductCommon[];
  activeProductIds: number[];
  selectedIds: Set<number>;
  onToggle: (productId: number) => void;
  emptyMessage?: string;
};

function ProductCheckList({
  products,
  activeProductIds,
  selectedIds,
  onToggle,
  emptyMessage = "No products available.",
}: ProductCheckListProps) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">{emptyMessage}</p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {products.map((product) => {
        const isActive = activeProductIds.includes(product.productId);
        const isSelected = selectedIds.has(product.productId);

        return (
          <label
            key={product.productId}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/10 cursor-pointer"
          >
            <Checkbox
              checked={isSelected || isActive}
              onCheckedChange={() => onToggle(product.productId)}
              disabled={isActive}
            />
            <span className="text-sm font-medium truncate flex-1">
              {product.description}
              {isActive && (
                <span className="text-xs text-muted-foreground ml-1">· added</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// By Production Date tab
// ---------------------------------------------------------------------------

type ByProductionDateTabProps = {
  activeProductIds: number[];
  selectedIds: Set<number>;
  onToggle: (productId: number) => void;
  onBulkSelect: (ids: number[], selected: boolean) => void;
};

function ByProductionDateTab({
  activeProductIds,
  selectedIds,
  onToggle,
  onBulkSelect,
}: ByProductionDateTabProps) {
  const lastCheck = useSelector(inventorySelect.lastCheck);
  const { setDateRange } = useInventory();
  const productIdsFromServices = useSelector(inventorySelect.productIdsFromServices);
  const allProductsMap = useSelector(productSelect.allProductsMap);
  const sessionDateRange = useSelector(inventorySelect.sessionDateRange);

  const [localRange, setLocalRange] = useState<TRange<string>>(() => ({
    min: lastCheck?.checkDate ?? "",
    max: dateStrings.today(),
  }));

  const handleSearch = () => {
    if (!localRange.min || !localRange.max) return;
    setDateRange(localRange);
  };

  const products = productIdsFromServices.flatMap((id) => {
    const product = allProductsMap.get(id);
    return product ? [product] : [];
  }).sort((a, b) => a.description.localeCompare(b.description));

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* Date range picker */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <DateRangePicker value={localRange} onChange={setLocalRange} size="sm" />
        <Button
          variant="primary"
          intensity="solid"
          size="sm"
          onClick={handleSearch}
          disabled={!localRange.min || !localRange.max}
        >
          <Search />
          Search
        </Button>
      </div>

      {/* Product list */}
      {!sessionDateRange ? (
        <p className="text-sm text-muted-foreground text-center py-3">
          Search a date range to see products from completed services.
        </p>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <SelectAllNone
            products={products}
            activeProductIds={activeProductIds}
            selectedIds={selectedIds}
            onBulkSelect={onBulkSelect}
          />
          <div className="flex-1 overflow-y-auto">
            <ProductCheckList
              products={products}
              activeProductIds={activeProductIds}
              selectedIds={selectedIds}
              onToggle={onToggle}
              emptyMessage="No products found in the selected date range."
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// From Last Count tab
// ---------------------------------------------------------------------------

type FromLastCountTabProps = {
  activeProductIds: number[];
  selectedIds: Set<number>;
  onToggle: (productId: number) => void;
  onBulkSelect: (ids: number[], selected: boolean) => void;
};

function FromLastCountTab({
  activeProductIds,
  selectedIds,
  onToggle,
  onBulkSelect,
}: FromLastCountTabProps) {
  const hydratedChecks = useSelector(inventorySelect.hydratedChecks);
  const lastCheck = hydratedChecks[0];

  if (!lastCheck) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No previous inventory check found.
      </p>
    );
  }

  const entriesWithQty = lastCheck.entries
    .filter((e) => e.totalCount > 0)
    .sort((a, b) => a.product.description.localeCompare(b.product.description));

  const products = entriesWithQty.map((e) => e.product);

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <p className="text-xs text-muted-foreground shrink-0">
        From check on {lastCheck.checkDate} — showing products with qty &gt; 0
      </p>
      <SelectAllNone
        products={products}
        activeProductIds={activeProductIds}
        selectedIds={selectedIds}
        onBulkSelect={onBulkSelect}
      />
      <div className="flex-1 overflow-y-auto">
        <ProductCheckList
          products={products}
          activeProductIds={activeProductIds}
          selectedIds={selectedIds}
          onToggle={onToggle}
          emptyMessage="No products with qty > 0 in the last check."
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Non-Zero / Zero Counts tabs (shared structure)
// ---------------------------------------------------------------------------

type LastCountTabProps = {
  products: ProductCommon[];
  activeProductIds: number[];
  selectedIds: Set<number>;
  onToggle: (productId: number) => void;
  onBulkSelect: (ids: number[], selected: boolean) => void;
  emptyMessage: string;
};

function LastCountTab({
  products,
  activeProductIds,
  selectedIds,
  onToggle,
  onBulkSelect,
  emptyMessage,
}: LastCountTabProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SelectAllNone
        products={products}
        activeProductIds={activeProductIds}
        selectedIds={selectedIds}
        onBulkSelect={onBulkSelect}
      />
      <div className="flex-1 overflow-y-auto">
        <ProductCheckList
          products={products}
          activeProductIds={activeProductIds}
          selectedIds={selectedIds}
          onToggle={onToggle}
          emptyMessage={emptyMessage}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manual tab
// ---------------------------------------------------------------------------

type ManualTabProps = {
  activeProductIds: number[];
  selectedIds: Set<number>;
  onToggle: (productId: number) => void;
  onBulkSelect: (ids: number[], selected: boolean) => void;
};

function ManualTab({ activeProductIds, selectedIds, onToggle, onBulkSelect }: ManualTabProps) {
  const productSingles = useSelector(productSelect.productSingles);
  const productSubs = useSelector(productSelect.productSubs);
  const [filter, setFilter] = useState("");

  const allProducts: ProductCommon[] = [...productSingles, ...productSubs].sort(
    (a, b) => a.description.localeCompare(b.description),
  );

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

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <Input
        type="text"
        placeholder="Search products..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="shrink-0"
      />
      {/* Select All/None applies to all currently visible (filtered) products */}
      <SelectAllNone
        products={filtered}
        activeProductIds={activeProductIds}
        selectedIds={selectedIds}
        onBulkSelect={onBulkSelect}
      />
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {sortedCategories.map((category) => (
          <div key={category}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-1">
              {category}
            </p>
            <ProductCheckList
              products={byCategory.get(category)!}
              activeProductIds={activeProductIds}
              selectedIds={selectedIds}
              onToggle={onToggle}
              emptyMessage=""
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No products match &ldquo;{filter}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main sheet
// ---------------------------------------------------------------------------

export function SelectProductsSheet() {
  const session = useSelector(inventorySelect.session);
  const nonZeroProducts = useSelector(inventorySelect.productsWithNonZeroLastCount);
  const zeroProducts = useSelector(inventorySelect.productsWithZeroLastCount);
  const { addProduct } = useInventory();

  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleId = (productId: number) => {
    if (session.activeProductIds.includes(productId)) return;
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

  const bulkSelect = (ids: number[], selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (session.activeProductIds.includes(id)) continue;
        if (selected) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
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
        <Button variant="primary" intensity="soft" size="sm">
          <PackageSearch />
          Select Products
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[95vh] flex flex-col">
        <SheetHeader className="pb-1">
          <SheetTitle>Select Products to Count</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="byDate" className="flex-1 min-h-0 flex flex-col">
          {/* Tab triggers — grid layout so all 5 fit on a phone with wrapped text */}
          <TabsList
            variant="primary"
            className="grid grid-cols-5 h-auto w-full self-stretch p-1 gap-0.5"
          >
            {(
              [
                { value: "byDate", label: "By Date" },
                { value: "lastCount", label: "Last Check" },
                { value: "nonZero", label: "Non-Zero" },
                { value: "zero", label: "Zero" },
                { value: "manual", label: "Manual" },
              ] as const
            ).map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                variant="primary"
                className="whitespace-normal text-center text-xs leading-tight px-1 py-1 h-auto"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="byDate" className="flex-1 min-h-0 mt-2">
            <ByProductionDateTab
              activeProductIds={session.activeProductIds}
              selectedIds={selectedIds}
              onToggle={toggleId}
              onBulkSelect={bulkSelect}
            />
          </TabsContent>

          <TabsContent value="lastCount" className="flex-1 min-h-0 mt-2">
            <FromLastCountTab
              activeProductIds={session.activeProductIds}
              selectedIds={selectedIds}
              onToggle={toggleId}
              onBulkSelect={bulkSelect}
            />
          </TabsContent>

          <TabsContent value="nonZero" className="flex-1 min-h-0 mt-2">
            <LastCountTab
              products={nonZeroProducts}
              activeProductIds={session.activeProductIds}
              selectedIds={selectedIds}
              onToggle={toggleId}
              onBulkSelect={bulkSelect}
              emptyMessage="No products with a non-zero last count."
            />
          </TabsContent>

          <TabsContent value="zero" className="flex-1 min-h-0 mt-2">
            <LastCountTab
              products={zeroProducts}
              activeProductIds={session.activeProductIds}
              selectedIds={selectedIds}
              onToggle={toggleId}
              onBulkSelect={bulkSelect}
              emptyMessage="No products with a zero last count."
            />
          </TabsContent>

          <TabsContent value="manual" className="flex-1 min-h-0 mt-2">
            <ManualTab
              activeProductIds={session.activeProductIds}
              selectedIds={selectedIds}
              onToggle={toggleId}
              onBulkSelect={bulkSelect}
            />
          </TabsContent>
        </Tabs>

        <SheetFooter className="shrink-0">
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
