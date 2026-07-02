"use client";

import { useState } from "react";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { UnitLabel } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { ProductCount } from "@/app/inventory/InventoryTypes";
import { UnitSelector } from "@/app/inventory/_components/countEntry/UnitSelector";
import { useInventory } from "@/app/inventory/useInventory";
import { Input } from "@/style/components/input";
import { Button } from "@/style/components/button";
import { Switch } from "@/style/components/switch";
import { Label } from "@/style/components/label";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";

type CountFormProps = {
  productId: number;
  product: ProductCommon;
};

/**
 * Determines whether the product's load unit represents a physical container
 * (e.g. "1 Gal Jug" = 128 Fl Oz). A load unit is a container when it has a
 * real label (not the base sentinel) and its conversionFactor > 1, meaning
 * one load unit equals multiple app units.
 */
function getContainerDefaults(product: ProductCommon): {
  isContainer: boolean;
  containerSize: string;
  unit: UnitLabel;
} {
  const loadConversion = product.unitConfig.conversions.load;
  const appConversion = product.unitConfig.conversions.app;

  const isContainer =
    loadConversion.unitLabel !== baseStrId && loadConversion.conversionFactor > 1;

  if (isContainer) {
    // The conversionFactor is in app units (e.g. 128 Fl Oz per jug).
    // Use bestFitUnit to express it in the most human-readable unit (e.g. 2.5 Gal, not 320 Fl Oz).
    const metric = appConversion.baseMetric;
    const best = UnitUtils.bestFitUnit(
      loadConversion.conversionFactor,
      appConversion.unitLabel as UnitLabel,
      metric,
    );
    return {
      isContainer: true,
      containerSize: String(best.value),
      unit: best.unit,
    };
  }

  // No container — default unit is load label if real, else app label
  const defaultUnit =
    loadConversion.unitLabel !== baseStrId
      ? (loadConversion.unitLabel as UnitLabel)
      : (appConversion.unitLabel as UnitLabel) || UnitLabel.unknown;

  return { isContainer: false, containerSize: "", unit: defaultUnit };
}

export function CountForm({ productId, product }: CountFormProps) {
  const { addCount } = useInventory();
  const metric = product.unit.metric;

  const defaults = getContainerDefaults(product);

  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<UnitLabel>(defaults.unit);
  const [isContainer, setIsContainer] = useState(defaults.isContainer);
  const [unitQty, setUnitQty] = useState(defaults.containerSize);
  const [location, setLocation] = useState("");

  const handleAdd = () => {
    const parsedQty = parseFloat(qty);
    if (isNaN(parsedQty) || parsedQty < 0) return;

    const count: ProductCount = {
      qty: parsedQty,
      unit,
      ...(isContainer && unitQty ? { unitQty: parseFloat(unitQty) } : {}),
      ...(location.trim() ? { location: location.trim() } : {}),
    };

    addCount(productId, count);

    // Reset qty and location — keep unit, container toggle, and container size
    // so the user can quickly enter another count of the same container type
    setQty("");
    setLocation("");
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-card rounded-lg border border-border">
      {/* Qty + container toggle row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Qty"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-24"
          min={0}
        />

        {isContainer && (
          <Input
            type="number"
            inputMode="decimal"
            placeholder="Container size"
            value={unitQty}
            onChange={(e) => setUnitQty(e.target.value)}
            className="w-32"
            min={0}
          />
        )}

        <UnitSelector metric={metric} value={unit} onChangeAction={setUnit} />

        {isContainer && (
          <span className="text-sm text-muted-foreground">container(s)</span>
        )}
      </div>

      {/* Container toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="container-toggle"
          checked={isContainer}
          onCheckedChange={setIsContainer}
        />
        <Label htmlFor="container-toggle" className="text-sm cursor-pointer">
          Container
        </Label>
      </div>

      {/* Location */}
      <Input
        type="text"
        placeholder="Location (optional)"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />

      {/* Add button */}
      <Button
        variant="primary"
        intensity="solid"
        onClick={handleAdd}
        disabled={qty === "" || isNaN(parseFloat(qty)) || parseFloat(qty) < 0}
        className="w-full"
      >
        Add
      </Button>
    </div>
  );
}
