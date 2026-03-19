"use client";

import React, { useState } from "react";
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
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";

interface SubEditPanelProps {
  product: ProductSub;
  productName: string;
}

export function SubEditPanel({ product, productName }: SubEditPanelProps) {
  const { updateCategory, updateUnit } = useProduct({});

  const [newCategoryName, setNewCategoryName] = useState(product.category);
  const [categoryStatus, setCategoryStatus] = useState<SaveStatus>("idle");

  const [newUnitDesc, setNewUnitDesc] = useState<UnitLabel>(product.unit.desc as UnitLabel);
  const [unitStatus, setUnitStatus] = useState<SaveStatus>("idle");

  React.useEffect(() => {
    setNewCategoryName(product.category);
    setCategoryStatus("idle");
    setNewUnitDesc(product.unit.desc as UnitLabel);
    setUnitStatus("idle");
  }, [product.productId, product.category, product.unit.unitId, product.unit.desc]);

  const canSaveCategory =
    newCategoryName !== product.category && newCategoryName.trim().length > 0;
  const canSaveUnit =
    newUnitDesc !== product.unit.desc && product.unit.unitId !== baseNumId;

  const handleSaveCategory = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setCategoryStatus("saving");
    try {
      await updateCategory(product.categoryId, trimmed);
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
        ...product.unit,
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
        <CardTitle>Edit Sub-Product</CardTitle>
        <p className="text-sm text-muted-foreground">{productName}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Row */}
        <form onSubmit={handleSaveCategory}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold whitespace-nowrap w-24">
              Category
            </span>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              ID: {product.categoryId}
            </span>
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
              onClick={() => setNewCategoryName(product.category)}
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
            Updates the category for all products in this category. Does not
            affect SA5 data.
          </p>
        </form>

        <div className="border-t" />

        {/* Unit Row */}
        <form onSubmit={handleSaveUnit}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold whitespace-nowrap w-24">
              Unit
            </span>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              ID: {product.unit.unitId}
            </span>
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
              onClick={() => setNewUnitDesc(product.unit.desc as UnitLabel)}
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
