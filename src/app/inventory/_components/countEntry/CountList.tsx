"use client";

import { useState } from "react";
import { ProductCount } from "@/app/inventory/InventoryTypes";
import { useInventory } from "@/app/inventory/useInventory";
import { Button } from "@/style/components/button";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";

type CountListProps = {
  productId: number;
  counts: ProductCount[];
};

function formatCount(count: ProductCount): string {
  if (count.unitQty) {
    return `${count.qty} × ${count.unitQty} ${count.unit} container(s)`;
  }
  return `${count.qty} ${count.unit}`;
}

export function CountList({ productId, counts }: CountListProps) {
  const { removeCount } = useInventory();
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);

  if (counts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No counts recorded yet.
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {counts.map((count, index) => (
          <li
            key={index}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-accent/10 border border-accent/20"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium">{formatCount(count)}</span>
              {count.location && (
                <span className="text-xs text-muted-foreground truncate">
                  {count.location}
                </span>
              )}
            </div>
            <Button
              variant="destructive"
              intensity="ghost"
              size="icon"
              onClick={() => setPendingRemoveIndex(index)}
              aria-label="Remove count"
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>

      {/* Confirmation dialog */}
      <Dialog
        open={pendingRemoveIndex !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoveIndex(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove count?</DialogTitle>
            <DialogDescription>
              {pendingRemoveIndex !== null && counts[pendingRemoveIndex]
                ? `Remove "${formatCount(counts[pendingRemoveIndex])}"${counts[pendingRemoveIndex].location ? ` at ${counts[pendingRemoveIndex].location}` : ""}?`
                : "Remove this count entry?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              intensity="ghost"
              onClick={() => setPendingRemoveIndex(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              intensity="solid"
              onClick={() => {
                if (pendingRemoveIndex !== null) {
                  removeCount(productId, pendingRemoveIndex);
                  setPendingRemoveIndex(null);
                }
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
