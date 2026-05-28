"use client";

import { use } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { inventorySelect, sumCountsToAppUnits } from "@/app/inventory/inventorySelect";
import { useInventory } from "@/app/inventory/useInventory";
import { CountForm } from "@/app/inventory/_components/countEntry/CountForm";
import { CountList } from "@/app/inventory/_components/countEntry/CountList";
import { Button } from "@/style/components/button";
import { ChevronLeft } from "lucide-react";
import { ProductCount } from "@/app/inventory/InventoryTypes";

type Params = { productId: string };

export default function CountEntryPage({ params }: { params: Promise<Params> }) {
  const { productId: productIdStr } = use(params);
  const productId = parseInt(productIdStr, 10);

  const router = useRouter();
  const { addCount, removeCount } = useInventory();

  const allProductsMap = useSelector(productSelect.allProductsMap);
  const product = allProductsMap.get(productId);

  const countsSelector = inventorySelect.makeCountsForProduct(productId);
  const counts = useSelector(countsSelector);

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <p className="text-muted-foreground">Product not found.</p>
        <Button variant="outline" intensity="ghost" onClick={() => router.back()}>
          <ChevronLeft />
          Back
        </Button>
      </div>
    );
  }

  const metric = product.unit.metric;
  const totalAppUnits = sumCountsToAppUnits(counts, metric);
  const totalDisplay = product.unitConfigDisplay.format({
    amount: totalAppUnits,
    targetContexts: ["load", "app"],
  });

  const handleAdd = (count: ProductCount) => {
    addCount(productId, count);
  };

  const handleRemove = (index: number) => {
    removeCount(productId, index);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <Button
          variant="outline"
          intensity="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="Back"
        >
          <ChevronLeft />
        </Button>
        <div className="flex flex-col min-w-0">
          <h1 className="text-base font-semibold truncate">{product.description}</h1>
          <p className="text-sm text-muted-foreground">
            On hand: {totalDisplay.formattedString}
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <CountForm product={product} onAdd={handleAdd} />
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Recorded counts
          </h2>
          <CountList counts={counts} onRemove={handleRemove} />
        </div>
      </div>
    </div>
  );
}
