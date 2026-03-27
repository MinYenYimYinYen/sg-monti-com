"use client";

import React from "react";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { CircleX } from "lucide-react";
import { SubProductConfigDoc } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { Label } from "@/style/components/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/style/components/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Equipment } from "@/app/equipment/EquipmentTypes";

interface MasterSubConfigProps {
  config: SubProductConfigDoc;
  subProduct: ProductSub | undefined;
  availableEquipments: Equipment[];
  onRemove: (subId: number) => void;
  onUpdateRate: (subId: number, storedRate: number) => void;
  onUpdateMixedBy: (subId: number, equipmentId: string | null) => void;
}

export function MasterSubConfig({
  config,
  subProduct,
  availableEquipments,
  onRemove,
  onUpdateRate,
  onUpdateMixedBy,
}: MasterSubConfigProps) {
  const selectedLabel = config.mixedByEquipmentId ?? "Standalone";

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

      {/* Mixed By Equipment */}
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap w-20">
          Mixed By:
        </Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-8 flex-1 justify-between font-normal text-xs"
            >
              {selectedLabel}
              <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onUpdateMixedBy(config.subId, null)}>
              Standalone
            </DropdownMenuItem>
            {availableEquipments.map((equipment) => (
              <DropdownMenuItem
                key={equipment.equipmentId}
                onClick={() => onUpdateMixedBy(config.subId, equipment.equipmentId)}
              >
                {equipment.equipmentId}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
