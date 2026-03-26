"use client";

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/style/components/sheet";
import { Button } from "@/style/components/button";
import { Badge } from "@/style/components/badge";
import { ScrollArea } from "@/style/components/scroll-area";
import { Label } from "@/style/components/label";
import { EquipmentPackageDoc } from "@/app/equipment/equipmentPackage/EquipmentPackageTypes";
import { useEquipmentPackage } from "@/app/equipment/equipmentPackage/useEquipmentPackage";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";

interface EquipmentPackageDeleteSheetProps {
  equipmentPackage: EquipmentPackageDoc;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteComplete?: () => void;
}

export function EquipmentPackageDeleteSheet({
  equipmentPackage,
  open,
  onOpenChange,
  onDeleteComplete,
}: EquipmentPackageDeleteSheetProps) {
  const { deleteEquipmentPackage } = useEquipmentPackage({});
  const productMasters = useSelector(productSelect.productMasters);
  const [isDeleting, setIsDeleting] = useState(false);

  // Find masters that reference this package
  const affectedMasters = productMasters.filter((m) =>
    (m.equipmentPackageIds ?? []).includes(equipmentPackage.packageId),
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEquipmentPackage({
        equipmentPackage,
        clearReferences: affectedMasters.length > 0,
      });
      onDeleteComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting equipment package:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Delete Equipment Package</SheetTitle>
          <SheetDescription>
            Review dependencies before deleting this package
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Package Info */}
          <div className="flex items-center gap-2">
            <Badge variant="outline">{equipmentPackage.packageId}</Badge>
            <span className="text-sm text-muted-foreground">
              {equipmentPackage.description}
            </span>
          </div>

          {affectedMasters.length === 0 ? (
            <div className="rounded-md border border-accent/30 bg-accent/10 p-4">
              <p className="text-sm text-foreground">
                No master products reference this package. Safe to delete.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Referenced by {affectedMasters.length} master product
                {affectedMasters.length !== 1 ? "s" : ""}
              </Label>
              <p className="text-xs text-muted-foreground">
                This package will be removed from all master products listed below.
              </p>
              <ScrollArea className="h-[200px] rounded-md border">
                <div className="p-3 space-y-1.5">
                  {affectedMasters.map((master) => (
                    <div key={master.productId} className="flex items-center gap-2 py-1">
                      <Badge variant="outline" className="font-mono text-xs">
                        {master.productCode}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {master.description}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <SheetFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting
              ? "Deleting…"
              : affectedMasters.length > 0
                ? "Remove from Masters & Delete"
                : "Delete Package"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
