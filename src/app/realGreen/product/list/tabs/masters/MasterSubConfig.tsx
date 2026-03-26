"use client";

import React from "react";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { CircleX } from "lucide-react";
import { SubProductConfigDoc } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { Label } from "@/style/components/label";

interface MasterSubConfigProps {
  config: SubProductConfigDoc;
  subProduct: ProductSub | undefined;
  onRemove: (subId: number) => void;
  onUpdateRate: (subId: number, storedRate: number) => void;
}

export function MasterSubConfig({
  config,
  subProduct,
  onRemove,
  onUpdateRate,
}: MasterSubConfigProps) {
  return (
    <div className="space-y-1 rounded-md border p-2.5">
      {/* Header with description and remove button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-sm font-medium">
            {subProduct?.description || `Sub ID: ${config.subId}`}
          </span>
        </div>
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
        <Label className="text-xs text-muted-foreground whitespace-nowrap">
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
    </div>
  );
}
