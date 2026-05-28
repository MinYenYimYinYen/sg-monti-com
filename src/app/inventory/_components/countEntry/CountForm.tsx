"use client";

import { useState } from "react";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { UnitLabel } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { ProductCount } from "@/app/inventory/InventoryTypes";
import { UnitSelector } from "@/app/inventory/_components/countEntry/UnitSelector";
import { Input } from "@/style/components/input";
import { Button } from "@/style/components/button";
import { Switch } from "@/style/components/switch";
import { Label } from "@/style/components/label";

type CountFormProps = {
  product: ProductCommon;
  onAdd: (count: ProductCount) => void;
};

function getDefaultUnit(product: ProductCommon): UnitLabel {
  const loadLabel = product.unitConfig.conversions.load.unitLabel;
  const appLabel = product.unitConfig.conversions.app.unitLabel;
  // Use load unit if it's a real label (not the base sentinel), else fall back to app unit
  return (loadLabel as UnitLabel) || (appLabel as UnitLabel) || UnitLabel.unknown;
}

export function CountForm({ product, onAdd }: CountFormProps) {
  const defaultUnit = getDefaultUnit(product);
  const metric = product.unit.metric;

  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<UnitLabel>(defaultUnit);
  const [isContainer, setIsContainer] = useState(false);
  const [unitQty, setUnitQty] = useState("");
  const [location, setLocation] = useState("");

  const handleAdd = () => {
    const parsedQty = parseFloat(qty);
    if (!parsedQty || parsedQty <= 0) return;

    const count: ProductCount = {
      qty: parsedQty,
      unit,
      ...(isContainer && unitQty ? { unitQty: parseFloat(unitQty) } : {}),
      ...(location.trim() ? { location: location.trim() } : {}),
    };

    onAdd(count);

    // Reset qty, unitQty, location — keep unit selection
    setQty("");
    setUnitQty("");
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

        <UnitSelector metric={metric} value={unit} onChange={setUnit} />

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
        disabled={!qty || parseFloat(qty) <= 0}
        className="w-full"
      >
        Add
      </Button>
    </div>
  );
}
