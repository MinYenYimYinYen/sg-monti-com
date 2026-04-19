"use client";
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { equipmentSelect } from "@/app/equipment/equipmentSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { Label } from "@/style/components/label";
import { Checkbox } from "@/style/components/checkbox";
import { Button } from "@/style/components/button";
import { Separator } from "@/style/components/separator";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { MixChartConfig, MixChartProductRow } from "@/app/realGreen/product/mixChart/_lib/MixChartTypes";
import { ProductList } from "./ProductList";
import { AddProductSheet } from "./AddProductSheet";
import { AppMethodOverrideSection } from "./AppMethodOverrideSection";
import { loadSavedAppMethod } from "@/app/appMethod/appMethodCreate/loadSavedAppMethod";
import { createAppMethodActions } from "@/app/appMethod/appMethodCreate/createAppMethodSlice";
import { solverSelect } from "@/app/appMethod/appMethodCreate/selectors/solverSelect";
import { AppDispatch } from "@/store";

type MixChartSetupProps = {
  config: MixChartConfig;
  onConfigChange: (config: MixChartConfig) => void;
};

export function MixChartSetup({ config, onConfigChange }: MixChartSetupProps) {
  const dispatch = useDispatch<AppDispatch>();
  const allEquipment = useSelector(equipmentSelect.equipments);
  const solution = useSelector(solverSelect.solution);

  const [appMethodExpanded, setAppMethodExpanded] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);

  const handleEquipmentChange = (equipmentId: string) => {
    const equipment = allEquipment.find((e) => e.equipmentId === equipmentId) ?? null;
    if (equipment) {
      // Pre-populate the AppMethod editor with this equipment's default method
      loadSavedAppMethod(equipment.appMethod, dispatch);
      dispatch(createAppMethodActions.setSolveForField({ param: "coverage", field: "volume" }));
    }
    onConfigChange({
      ...config,
      equipment,
      appMethodOverride: null,
      // Default includeWater based on the equipment's appMethod.needsWater
      includeWater: equipment?.appMethod.needsWater ?? false,
    });
  };

  const handleIncludeWaterChange = (checked: boolean) => {
    onConfigChange({ ...config, includeWater: checked });
  };

  const handleAddProducts = (rows: MixChartProductRow[]) => {
    onConfigChange({ ...config, products: [...config.products, ...rows] });
  };

  const handleRateChange = (id: string, rate: number) => {
    onConfigChange({
      ...config,
      products: config.products.map((p) => (p.id === id ? { ...p, rate } : p)),
    });
  };

  const handleRemoveProduct = (id: string) => {
    onConfigChange({
      ...config,
      products: config.products.filter((p) => p.id !== id),
    });
  };

  // Sync the effective AppMethod override from the solver solution
  const effectiveAppMethod = solution?.success ? solution.result : null;

  return (
    <div className="space-y-5">
      {/* Step 1: Equipment */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Equipment</Label>
        <Select
          value={config.equipment?.equipmentId ?? ""}
          onValueChange={handleEquipmentChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select equipment" />
          </SelectTrigger>
          <SelectContent>
            {allEquipment.map((equipment) => (
              <SelectItem key={equipment.equipmentId} value={equipment.equipmentId}>
                {equipment.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Step 2: AppMethod Override (collapsible) */}
      {config.equipment && (
        <>
          <Separator />
          <div className="space-y-2">
            <button
              type="button"
              className="flex items-center justify-between w-full text-left"
              onClick={() => setAppMethodExpanded((prev) => !prev)}
            >
              <Label className="text-sm font-semibold cursor-pointer">
                Customize Application Method
              </Label>
              {appMethodExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {appMethodExpanded && (
              <AppMethodOverrideSection
                equipment={config.equipment}
                onSolutionChange={() => {
                  // The parent reads solverSelect.solution directly via effectiveAppMethod
                }}
              />
            )}
          </div>
        </>
      )}

      {/* Step 3: Water */}
      {config.equipment && (
        <>
          <Separator />
          <div className="flex items-center gap-2">
            <Checkbox
              id="include-water"
              checked={config.includeWater}
              onCheckedChange={(checked) => handleIncludeWaterChange(!!checked)}
            />
            <Label htmlFor="include-water" className="text-sm cursor-pointer">
              Include Water Column
            </Label>
            {config.includeWater && effectiveAppMethod && (
              <span className="text-xs text-muted-foreground ml-2">
                (rate derived from AppMethod coverage)
              </span>
            )}
          </div>
        </>
      )}

      {/* Step 4: Products */}
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Products</Label>
          <Button
            variant="primary"
            intensity="soft"
            size="sm"
            onClick={() => setAddProductOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Product
          </Button>
        </div>

        <ProductList
          products={config.products}
          onRateChange={handleRateChange}
          onRemove={handleRemoveProduct}
        />
      </div>

      <AddProductSheet
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        onAdd={handleAddProducts}
      />
    </div>
  );
}
