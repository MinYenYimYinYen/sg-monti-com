"use client";

import React from "react";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { CircleX } from "lucide-react";
import { SubProductConfigDoc } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { Label } from "@/style/components/label";
import { Checkbox } from "@/style/components/checkbox";
import { Equipment } from "@/app/equipment/EquipmentTypes";

interface MasterSubConfigProps {
  config: SubProductConfigDoc;
  subProduct: ProductSub | undefined;
  availableEquipments: Equipment[];
  onRemove: (subId: number) => void;
  onUpdateRate: (subId: number, storedRate: number) => void;
  onUpdateMixedBy: (subId: number, equipmentIds: string[]) => void;
}

export function MasterSubConfig({
  config,
  subProduct,
  availableEquipments,
  onRemove,
  onUpdateRate,
  onUpdateMixedBy,
}: MasterSubConfigProps) {
  const selectedIds = config.mixedByEquipmentIds;

  const toggleEquipment = (equipmentId: string) => {
    const next = selectedIds.includes(equipmentId)
      ? selectedIds.filter((id) => id !== equipmentId)
      : [...selectedIds, equipmentId];
    onUpdateMixedBy(config.subId, next);
  };

  return (
    <div className="space-y-1 rounded-md border p-2.5">
      {/* Header with description and remove button */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {subProduct?.description || `Sub ID: ${config.subId}`}
        </span>
        <Button
          variant="outline"
          intensity="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onRemove(config.subId)}
        >
          <CircleX />
        </Button>
      </div>

      {/* Rate Input */}
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap w-20">
          Default Rate:
        </Label>
        <Input
          type="number"
          className="h-8"
          value={config.storedRate}
          onChange={(e) =>
            onUpdateRate(config.subId, parseFloat(e.target.value) || 0)
          }
        />
      </div>

      {/* Mixed By Equipment — multi-select checkboxes */}
      {availableEquipments.length > 0 && (
        <div className="flex items-start gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap w-20 pt-0.5">
            Mixed By:
          </Label>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {availableEquipments.map((equipment) => (
              <div key={equipment.equipmentId} className="flex items-center gap-1.5">
                <Checkbox
                  id={`${config.subId}-${equipment.equipmentId}`}
                  checked={selectedIds.includes(equipment.equipmentId)}
                  onCheckedChange={() => toggleEquipment(equipment.equipmentId)}
                />
                <label
                  htmlFor={`${config.subId}-${equipment.equipmentId}`}
                  className="text-xs cursor-pointer"
                >
                  {equipment.equipmentId}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
