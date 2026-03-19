"use client";

import React from "react";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { Button } from "@/style/components/button";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { Input } from "@/style/components/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/style/components/card";
import {
  UnitCRM,
  UnitLabel,
  getMetricForUL,
} from "@/app/realGreen/product/unitConfig/UnitTypes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/style/components/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";

interface EditAttributesPanelProps {
  categoryId: number;
  categoryName: string;
  unit: UnitCRM;
  productName: string;
}

export function EditAttributesPanel({
  categoryId,
  categoryName,
  unit,
  productName,
}: EditAttributesPanelProps) {
  const { updateCategory, updateUnit } = useProduct({});

  const [newCategoryName, setNewCategoryName] = React.useState(categoryName);
  const [categoryStatus, setCategoryStatus] = React.useState<SaveStatus>("idle");

  const [newUnitDesc, setNewUnitDesc] = React.useState<UnitLabel>(unit.desc as UnitLabel);
  const [unitStatus, setUnitStatus] = React.useState<SaveStatus>("idle");

  // Reset when the selected product changes
  React.useEffect(() => {
    setNewCategoryName(categoryName);
    setCategoryStatus("idle");
    setNewUnitDesc(unit.desc as UnitLabel);
    setUnitStatus("idle");
  }, [categoryId, categoryName, unit.unitId, unit.desc]);

  const canSaveCategory =
    newCategoryName !== categoryName && newCategoryName.trim().length > 0;

  const canSaveUnit = newUnitDesc !== unit.desc && unit.unitId !== baseNumId;

  const handleSaveCategory = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setCategoryStatus("saving");
    try {
      await updateCategory(categoryId, trimmed);
      setCategoryStatus("success");
    } catch (error) {
      console.error("Failed to save category", error);
      setCategoryStatus("idle");
    }
  };

  const handleSaveUnit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSaveUnit) return;
    setUnitStatus("saving");
    try {
      await updateUnit({
        ...unit,
        desc: newUnitDesc,
        metric: getMetricForUL(newUnitDesc),
      } as UnitCRM);
      setUnitStatus("success");
    } catch (error) {
      console.error("Failed to save unit", error);
      setUnitStatus("idle");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attributes</CardTitle>
        <p className="text-sm text-muted-foreground">{productName}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Row */}
        <form onSubmit={handleSaveCategory}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold whitespace-nowrap w-24">Category</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
              <span>ID: {categoryId}</span>
            </div>
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 min-w-[140px]"
            />
            <SaveButton
              type="submit"
              size="sm"
              variant="primary"
              onClick={handleSaveCategory}
              disabled={!canSaveCategory}
              status={categoryStatus}
              onSuccessComplete={() => setCategoryStatus("idle")}
            >
              Save
            </SaveButton>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setNewCategoryName(categoryName)}
              disabled={
                !canSaveCategory ||
                categoryStatus === "saving" ||
                categoryStatus === "success"
              }
            >
              Reset
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-[calc(6rem+0.75rem)]">
            Updates the category for all products in this category. Does not affect SA5 data.
          </p>
        </form>

        <div className="border-t" />

        {/* Unit Row */}
        <form onSubmit={handleSaveUnit}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold whitespace-nowrap w-24">Unit</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
              <span>ID: {unit.unitId}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 min-w-[140px] justify-between font-normal"
                >
                  {newUnitDesc}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.values(UnitLabel).map((ulValue) => (
                  <DropdownMenuItem
                    key={ulValue}
                    onClick={() => setNewUnitDesc(ulValue)}
                  >
                    {ulValue}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <SaveButton
              type="submit"
              size="sm"
              variant="primary"
              onClick={handleSaveUnit}
              disabled={!canSaveUnit}
              status={unitStatus}
              onSuccessComplete={() => setUnitStatus("idle")}
            >
              Save
            </SaveButton>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setNewUnitDesc(unit.desc as UnitLabel)}
              disabled={
                !canSaveUnit ||
                unitStatus === "saving" ||
                unitStatus === "success"
              }
            >
              Reset
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-[calc(6rem+0.75rem)]">
            Updates the unit description for all products using this unit.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
