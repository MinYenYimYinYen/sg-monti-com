"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { ChevronDown } from "lucide-react";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { MasterEditPanel } from "./masters/MasterEditPanel";
import { MultiSelect } from "@/components/multiselect/MultiSelect";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectValue } from "@/components/multiselect/MultiSelectValue";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";
import { MultiSelectEmpty } from "@/components/multiselect/MultiSelectEmpty";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";

export default function MastersTab() {
  const masters = useSelector(productSelect.productMasters);
  const mastersMap = useSelector(productSelect.productMastersMap);

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const selectedProduct = selectedProductId ? mastersMap.get(selectedProductId) : null;

  const handleValueChange = (values: ProductMaster[]) => {
    setSelectedProductId(values[0]?.productId ?? null);
  };

  const selectedValues: ProductMaster[] = selectedProduct ? [selectedProduct] : [];

  return (
    <div className="space-y-3">
      {/* Product Selector — full-width combobox */}
      <MultiSelect<ProductMaster>
        mode="single"
        value={selectedValues}
        onValueChange={handleValueChange}
        getValueKey={(m) => String(m.productId)}
        compareValues={(a, b) => a.productId === b.productId}
        getDisplayValue={(m) => `${m.productCode} — ${m.description}`}
      >
        <MultiSelectTrigger className="w-full">
          <MultiSelectValue placeholder="Select a master product…" />
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </MultiSelectTrigger>
        <MultiSelectContent className="w-full max-h-[320px]" align="start">
          {masters.length === 0 ? (
            <MultiSelectEmpty>No master products found</MultiSelectEmpty>
          ) : (
            masters
              .slice()
              .sort((a, b) => a.productCode.localeCompare(b.productCode))
              .map((master) => (
                <MultiSelectItem key={master.productId} value={master}>
                  <span className="font-mono text-xs text-muted-foreground mr-2">
                    {master.productCode}
                  </span>
                  <span className="text-sm">{master.description}</span>
                </MultiSelectItem>
              ))
          )}
        </MultiSelectContent>
      </MultiSelect>

      {/* Edit Panel */}
      {selectedProduct ? (
        <MasterEditPanel
          key={selectedProduct.productId}
          master={selectedProduct}
          productName={`${selectedProduct.productCode} — ${selectedProduct.description}`}
        />
      ) : (
        <div className="flex items-center justify-center h-[400px] border-2 border-dashed border-muted rounded-lg">
          <p className="text-muted-foreground">Select a product to edit its configuration</p>
        </div>
      )}
    </div>
  );
}
