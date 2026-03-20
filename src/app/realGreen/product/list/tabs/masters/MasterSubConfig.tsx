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
import { ChevronDown } from "lucide-react";
import { SubProductConfigDoc } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { AppMethod } from "@/app/realGreen/product/appMethod/AppMethodTypes";

interface MasterSubConfigProps {
  config: SubProductConfigDoc;
  subProduct: ProductSub | undefined;
  onRemove: (subId: number) => void;
  onUpdateRate: (subId: number, rate: number) => void;
  onUpdateUseAppMethod: (subId: number, useAppMethod: boolean) => void;
  onUpdateAppMethodId: (subId: number, appMethodId: string | null) => void;
  appMethods: AppMethod[];
  appMethodMap: Map<string, AppMethod>;
}

export function MasterSubConfig({
  config,
  subProduct,
  onRemove,
  onUpdateRate,
  onUpdateUseAppMethod,
  onUpdateAppMethodId,
  appMethods,
  appMethodMap,
}: MasterSubConfigProps) {
  const selectedAppMethod = config.appMethodId
    ? appMethodMap.get(config.appMethodId)
    : null;

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
          
        </Button>
      </div>

      {/* Use App Method Checkbox */}
      <div
        className="flex items-center hover:bg-primary/10 p-1 rounded-md gap-2 cursor-pointer"
        onClick={() => onUpdateUseAppMethod(config.subId, !config.useAppMethod)}
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
                  onClick={() => onUpdateAppMethodId(config.subId, method.appMethodId)}
                >
                  {method.appMethodId}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Rate Input */}
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">
          Rate:
        </Label>
        <Input
          type="number"
          className="h-8"
          value={config.rate}
          onChange={(e) =>
            onUpdateRate(config.subId, parseFloat(e.target.value) || 0)
          }
        />
      </div>
    </div>
  );
}
