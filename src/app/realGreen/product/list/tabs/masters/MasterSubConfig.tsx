"use client";

import React from "react";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Checkbox } from "@/style/components/checkbox";
import { Label } from "@/style/components/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/style/components/dropdown-menu";
import { ChevronDown, CircleX } from "lucide-react";
import { SubProductConfigDoc } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { AppMethod } from "@/app/realGreen/product/appMethod/AppMethodTypes";
import {
  MultiSelect,

} from "@/components/multiselect/MultiSelect";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";
import { MultiSelectValue } from "@/components/multiselect/MultiSelectValue";

interface MasterSubConfigProps {
  config: SubProductConfigDoc;
  subProduct: ProductSub | undefined;
  onRemove: (subId: number) => void;
  onUpdateRate: (subId: number, storedRate: number) => void;
  onUpdateUseAppMethod: (subId: number, useAppMethod: boolean) => void;
  onUpdateAppMethodId: (subId: number, appMethodId: string | null) => void;
  onUpdateMixedProductIds: (subId: number, mixedProductIds: number[]) => void;
  appMethods: AppMethod[];
  appMethodMap: Map<string, AppMethod>;
  allConfigs: SubProductConfigDoc[];
  allSubProducts: ProductSub[];
}

export function MasterSubConfig({
  config,
  subProduct,
  onRemove,
  onUpdateRate,
  onUpdateUseAppMethod,
  onUpdateAppMethodId,
  onUpdateMixedProductIds,
  appMethods,
  appMethodMap,
  allConfigs,
  allSubProducts,
}: MasterSubConfigProps) {
  const selectedAppMethod = config.appMethodId
    ? appMethodMap.get(config.appMethodId)
    : null;

  // Build a set of all product IDs that are mixed into OTHER configs (not this one)
  const mixedInOtherConfigs = new Set<number>();
  allConfigs.forEach((c) => {
    if (c.subId !== config.subId) {
      // Only look at OTHER configs
      c.mixedProductIds?.forEach((id) => {
        mixedInOtherConfigs.add(id);
      });
    }
  });

  // Check if THIS product is already mixed into another product
  const isThisProductMixed = mixedInOtherConfigs.has(config.subId);

  const availableSiblings = allSubProducts.filter((sub) => {
    // Must be in the master's sub-configs
    if (!allConfigs.some((c) => c.subId === sub.productId)) return false;

    // Cannot select yourself
    if (sub.productId === config.subId) return false;

    // Cannot select products already mixed into OTHER configs
    if (mixedInOtherConfigs.has(sub.productId)) return false;

    // Cannot select products that also use app method (they're carriers too)
    const subConfig = allConfigs.find((c) => c.subId === sub.productId);
    if (subConfig?.useAppMethod) return false;

    return true;
  });

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

      {/* Use App Method Checkbox - only show if this product is NOT already mixed */}
      {!isThisProductMixed && (
        <div
          className="flex items-center hover:bg-primary/10 p-1 rounded-md gap-2 cursor-pointer"
          onClick={() =>
            onUpdateUseAppMethod(config.subId, !config.useAppMethod)
          }
        >
          <Checkbox
            id={`useAppMethod-${config.subId}`}
            className="size-3.5"
            checked={config.useAppMethod}
            onCheckedChange={(checked) =>
              onUpdateUseAppMethod(config.subId, !!checked)
            }
          />
          <Label
            htmlFor={`useAppMethod-${config.subId}`}
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Use App Method
          </Label>
        </div>
      )}

      {/* App Method Dropdown - only visible when useAppMethod is true */}
      {config.useAppMethod && (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">
            App Method:
          </Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 justify-between font-normal"
              >
                {selectedAppMethod?.appMethodId || "Select method..."}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => onUpdateAppMethodId(config.subId, null)}
              >
                <span className="text-muted-foreground">None</span>
              </DropdownMenuItem>
              {appMethods.map((method) => (
                <DropdownMenuItem
                  key={method.appMethodId}
                  onClick={() =>
                    onUpdateAppMethodId(config.subId, method.appMethodId)
                  }
                >
                  {method.appMethodId}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Mixed Products MultiSelect - only visible when useAppMethod is true */}
      {config.useAppMethod && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Mixed Products:
          </Label>
          <MultiSelect
            mode="multiple"
            value={config.mixedProductIds}
            onValueChange={(ids) => onUpdateMixedProductIds(config.subId, ids)}
            getValueKey={(id) => String(id)}
            getDisplayValue={(id) => {
              const sub = allSubProducts.find((s) => s.productId === id);
              return sub?.description || `ID: ${id}`;
            }}
            getMultiDisplayValue={(ids) => {
              if (ids.length === 0) return "";
              if (ids.length === 1) {
                const sub = allSubProducts.find((s) => s.productId === ids[0]);
                return sub?.description || `ID: ${ids[0]}`;
              }
              return `${ids.length} products selected`;
            }}
          >
            <MultiSelectTrigger size="sm">
              <MultiSelectValue placeholder="Select products to mix..." />
            </MultiSelectTrigger>
            <MultiSelectContent className="max-h-[200px] w-[300px]">
              {availableSiblings.map((sub) => (
                <MultiSelectItem key={sub.productId} value={sub.productId}>
                  {sub.description}
                </MultiSelectItem>
              ))}
            </MultiSelectContent>
          </MultiSelect>
        </div>
      )}

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
