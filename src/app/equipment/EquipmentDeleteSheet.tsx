"use client";

import React, { useState, useEffect } from "react";
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
import { EquipmentDoc } from "@/app/equipment/EquipmentTypes";
import { useEquipment } from "@/app/equipment/useEquipment";
import { api } from "@/lib/api/api";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { DataResponse } from "@/lib/api/types/responses";
import { EquipmentContract } from "@/app/equipment/api/EquipmentContract";

interface EquipmentDeleteSheetProps {
  equipment: EquipmentDoc;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteComplete?: () => void;
}

export function EquipmentDeleteSheet({
  equipment,
  open,
  onOpenChange,
  onDeleteComplete,
}: EquipmentDeleteSheetProps) {
  const { deleteEquipment } = useEquipment({});
  const [dependentPackageIds, setDependentPackageIds] = useState<string[]>([]);
  const [isLoadingDeps, setIsLoadingDeps] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load dependencies when sheet opens
  useEffect(() => {
    if (!open) return;
    setIsLoadingDeps(true);
    const body: OpMap<EquipmentContract> = {
      op: "checkDependencies",
      equipmentId: equipment.equipmentId,
    };
    api<DataResponse<{ packageIds: string[] }> | { success: false; message: string }>(
      "/equipment/api",
      { method: "POST", body },
    )
      .then((result) => {
        if (result && "payload" in result && result.success) {
          setDependentPackageIds(result.payload.packageIds);
        }
      })
      .finally(() => setIsLoadingDeps(false));
  }, [open, equipment.equipmentId]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEquipment({
        equipment,
        clearReferences: dependentPackageIds.length > 0,
      });
      onDeleteComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting equipment:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Delete Equipment</SheetTitle>
          <SheetDescription>
            Review dependencies before deleting this equipment item
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Equipment Info */}
          <div className="flex items-center gap-2">
            <Badge variant="outline">{equipment.equipmentId}</Badge>
            <span className="text-sm text-muted-foreground">
              {equipment.description}
            </span>
          </div>

          {isLoadingDeps ? (
            <p className="text-sm text-muted-foreground">Checking dependencies…</p>
          ) : dependentPackageIds.length === 0 ? (
            <div className="rounded-md border border-accent/30 bg-accent/10 p-4">
              <p className="text-sm text-foreground">
                No equipment packages reference this equipment. Safe to delete.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Referenced by {dependentPackageIds.length} package
                {dependentPackageIds.length !== 1 ? "s" : ""}
              </Label>
              <p className="text-xs text-muted-foreground">
                This equipment will be removed from all packages listed below.
              </p>
              <ScrollArea className="h-[200px] rounded-md border">
                <div className="p-3 space-y-1.5">
                  {dependentPackageIds.map((packageId) => (
                    <div key={packageId} className="flex items-center gap-2 py-1">
                      <Badge variant="outline" className="font-mono text-xs">
                        {packageId}
                      </Badge>
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
            disabled={isDeleting || isLoadingDeps}
          >
            {isDeleting
              ? "Deleting…"
              : dependentPackageIds.length > 0
                ? "Remove from Packages & Delete"
                : "Delete Equipment"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
