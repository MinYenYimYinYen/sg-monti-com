"use client";
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { appMethodSelect } from "@/app/appMethod/appMethodSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { Label } from "@/style/components/label";
import { Input } from "@/style/components/input";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { Checkbox } from "@/style/components/checkbox";
import { Button } from "@/style/components/button";
import { Separator } from "@/style/components/separator";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import {
  MixChartConfig,
  MixChartProductRow,
} from "@/app/realGreen/product/mixChart/_lib/MixChartTypes";
import { ProductList } from "./ProductList";
import { AddProductSheet } from "./AddProductSheet";
import { AppMethodOverrideSection } from "./AppMethodOverrideSection";
import { loadSavedAppMethod } from "@/app/appMethod/appMethodCreate/loadSavedAppMethod";
import { defaultMixChartTitle } from "@/app/realGreen/product/mixChart/_lib/mixChartUtils";
import { solverSelect } from "@/app/appMethod/appMethodCreate/selectors/solverSelect";
import { AppDispatch } from "@/store";

type MixChartSetupProps = {
  config: MixChartConfig;
  onConfigChangeAction: (config: MixChartConfig) => void;
};

export function MixChartSetup({
  config,
  onConfigChangeAction: onConfigChange,
}: MixChartSetupProps) {
  const dispatch = useDispatch<AppDispatch>();
  const appMethods = useSelector(appMethodSelect.appMethodDocs);
  const solution = useSelector(solverSelect.solution);

  const [appMethodExpanded, setAppMethodExpanded] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);

  const handleAppMethodChange = (appMethodId: string) => {
    const appMethod = appMethods.find((m) => m.appMethodId === appMethodId);
    if (!appMethod) return;
    // Loads the method into the editor and selects "solve for coverage volume"
    loadSavedAppMethod(appMethod, dispatch);
    onConfigChange({
      ...config,
      appMethod,
      includeWater: appMethod.needsWater,
      // Overwrites an edited title: picking a method starts the chart over
      title: defaultMixChartTitle(appMethod),
    });
  };

  const handleTitleChange = (title: string) => {
    onConfigChange({ ...config, title });
  };

  const handleShowFlOzChange = (showFlOz: boolean) => {
    onConfigChange({ ...config, showFlOz });
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

  // Only drives the "rate derived" hint; the page applies the solver result to the chart
  const effectiveAppMethod = solution?.success ? solution.result : null;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="mix-chart-title" className="text-sm font-semibold">
          Title
        </Label>
        <Input
          id="mix-chart-title"
          value={config.title}
          onChange={(e) => handleTitleChange(e.target.value)}
        />
      </div>

      <Separator />

      {/* Step 1: Application method */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Application Method</Label>
        <Select
          value={config.appMethod?.appMethodId ?? ""}
          onValueChange={handleAppMethodChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select application method" />
          </SelectTrigger>
          <SelectContent>
            {appMethods.map((appMethod) => (
              <SelectItem
                key={appMethod.appMethodId}
                value={appMethod.appMethodId}
              >
                {appMethod.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Step 2: AppMethod Override (collapsible) */}
      {config.appMethod && (
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
              <AppMethodOverrideSection appMethod={config.appMethod} />
            )}
          </div>
        </>
      )}

      {/* Step 3: Water */}
      {config.appMethod && (
        <>
          <Separator />
          <div className="space-y-3">
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

            {config.includeWater && (
              <div className="space-y-2">
                <Label className="text-sm">Water Unit</Label>
                <RadioGroup
                  variant="button-group"
                  value={config.showFlOz ? "flOz" : "gal"}
                  onValueChange={(value) => handleShowFlOzChange(value === "flOz")}
                >
                  <RadioGroupItem value="gal">Gallons</RadioGroupItem>
                  <RadioGroupItem value="flOz">Fl Oz</RadioGroupItem>
                </RadioGroup>
              </div>
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
          onRateChangeAction={handleRateChange}
          onRemoveAction={handleRemoveProduct}
        />
      </div>

      <AddProductSheet
        open={addProductOpen}
        onOpenChangeAction={setAddProductOpen}
        onAddAction={handleAddProducts}
      />
    </div>
  );
}
