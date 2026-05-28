"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { InventoryPrediction } from "@/app/inventory/InventoryTypes";
import { inventorySelect, sumCountsToAppUnits } from "@/app/inventory/inventorySelect";
import { useInventory } from "@/app/inventory/useInventory";
import { Button } from "@/style/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { Trash2, ChevronRight } from "lucide-react";

type ProductListRowProps = {
  product: ProductCommon;
  prediction: InventoryPrediction | undefined;
};

export function ProductListRow({ product, prediction }: ProductListRowProps) {
  const router = useRouter();
  const { removeProduct } = useInventory();
  const [confirmRemove, setConfirmRemove] = useState(false);

  const countsSelector = inventorySelect.makeCountsForProduct(product.productId);
  const counts = useSelector(countsSelector);

  const metric = product.unit.metric;
  const totalAppUnits = sumCountsToAppUnits(counts, metric);
  const totalDisplay = product.unitConfigDisplay.format({
    amount: totalAppUnits,
    targetContexts: ["load", "app"],
  });

  const plannedDisplay = prediction
    ? product.unitConfigDisplay.format({
        amount: prediction.plannedUsed,
        targetContexts: ["load", "app"],
      })
    : null;

  const recordedDisplay = prediction
    ? product.unitConfigDisplay.format({
        amount: prediction.recordedUsed,
        targetContexts: ["load", "app"],
      })
    : null;

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card active:bg-accent/10">
        {/* Tap target — navigates to count entry */}
        <button
          className="flex-1 flex flex-col items-start text-left min-w-0"
          onClick={() => router.push(`/inventory/${product.productId}`)}
        >
          <span className="text-sm font-semibold truncate w-full">
            {product.description}
          </span>
          {prediction && (
            <div className="flex flex-col mt-0.5">
              <span className="text-xs text-muted-foreground">
                Planned: {plannedDisplay?.formattedString ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                Recorded: {recordedDisplay?.formattedString ?? "—"}
              </span>
            </div>
          )}
          {counts.length > 0 ? (
            <span className="text-sm font-medium text-accent mt-1">
              On hand: {totalDisplay.formattedString}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground mt-1 italic">
              Tap to add counts
            </span>
          )}
        </button>

        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />

        {/* Remove button */}
        <Button
          variant="destructive"
          intensity="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmRemove(true);
          }}
          aria-label="Remove product"
        >
          <Trash2 />
        </Button>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove product?</DialogTitle>
            <DialogDescription>
              Remove {product.description} from the inventory list? Any counts
              you&apos;ve entered will be preserved if you add it back.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              intensity="ghost"
              onClick={() => setConfirmRemove(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              intensity="solid"
              onClick={() => {
                removeProduct(product.productId);
                setConfirmRemove(false);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
