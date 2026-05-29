"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { inventorySelect, sumCountsToAppUnits } from "@/app/inventory/inventorySelect";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { authSelect } from "@/app/auth/authSlice";
import { useInventory } from "@/app/inventory/useInventory";
import { InventoryCheckDoc, InventoryCheckEntry } from "@/app/inventory/InventoryTypes";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import { FooterPortal } from "@/components/FooterPortal";
import { Button } from "@/style/components/button";
import { UnitLabel } from "@/app/realGreen/product/unitConfig/UnitTypes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";

export function SaveInventoryButton() {
  const session = useSelector(inventorySelect.session);
  const allProductsMap = useSelector(productSelect.allProductsMap);
  const userName = useSelector(authSelect.user)?.userName ?? "";
  const { save } = useInventory();

  const [confirmOpen, setConfirmOpen] = useState(false);

  // Only include active products that have at least one count
  const submittableIds = session.activeProductIds.filter(
    (id) => (session.counts[id]?.length ?? 0) > 0,
  );

  const isDisabled = submittableIds.length === 0;

  const handleSave = async () => {
    const entries: InventoryCheckEntry[] = submittableIds.flatMap((productId) => {
      const product = allProductsMap.get(productId);
      const counts = session.counts[productId] ?? [];
      if (!product || counts.length === 0) return [];

      const totalCount = sumCountsToAppUnits(counts, product);
      const unit = product.unitConfig.conversions.app.unitLabel as UnitLabel;

      return [{ productId, totalCount, unit, counts }];
    });

    const check: InventoryCheckDoc = {
      checkDate: dateStrings.today(),
      entries,
      createdBy: userName,
    };

    setConfirmOpen(false);
    await save(check);
  };

  return (
    <>
      <FooterPortal>
        <Button
          variant="accent"
          intensity="solid"
          disabled={isDisabled}
          onClick={() => setConfirmOpen(true)}
          size="sm"
          className={"h-6"}
        >
          Save Inventory
          {!isDisabled && ` (${submittableIds.length})`}
        </Button>
      </FooterPortal>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save inventory?</DialogTitle>
            <DialogDescription>
              This will save counts for {submittableIds.length} product
              {submittableIds.length !== 1 ? "s" : ""} and clear the current
              session. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              intensity="ghost"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="accent" intensity="solid" onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
