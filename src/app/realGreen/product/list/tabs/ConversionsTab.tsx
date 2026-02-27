"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { ProductSelector } from "./components/ProductSelector";
import { ConversionList } from "./components/ConversionList";
import { useUnitConfig } from "@/app/realGreen/product/_lib/hooks/useUnitConfig";
import { UnitConversion } from "@/app/realGreen/product/_lib/types/ProductUnitConfigTypes";
import { Alert, AlertDescription } from "@/style/components/alert";
import { Info } from "lucide-react";
import { unitConfigSelect } from "@/app/realGreen/product/_lib/selectors/unitConfigSelectors";

export default function ConversionsTab() {
  const productCommonDocs = useSelector(productSelect.productCommonDocs);
  const productCommonMap = useSelector(productSelect.productCommonMap);
  const unitConfigsByProductId = useSelector(unitConfigSelect.unitConfigMap);

  const { saveConfig } = useUnitConfig({});

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const selectedProduct = selectedProductId
    ? productCommonMap.get(selectedProductId)
    : null;

  // Get conversions from selectedProduct.unitConfig, which has smart defaults applied
  const conversions = selectedProduct?.unitConfig.conversions
    ? Object.values(selectedProduct.unitConfig.conversions)
    : [];

  const handleSaveConversion = async (updatedConversion: UnitConversion) => {
    if (!selectedProductId || !selectedProduct) return;

    // Get the stored config (not the one with smart defaults)
    const storedConfig = unitConfigsByProductId.get(selectedProductId);

    const updatedConversions = storedConfig?.conversions
      ? { ...storedConfig.conversions }
      : { ...selectedProduct.unitConfig.conversions };

    // Update the specific conversion
    updatedConversions[updatedConversion.context] = updatedConversion;

    await saveConfig({
      productId: selectedProductId,
      conversions: updatedConversions,
    });
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure how products are measured in different contexts. Application
          context uses base units from SA5. Loading and Purchasing contexts
          allow custom conversions (e.g., bags, pallets).
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-12 gap-4">
        {/* Left Panel: Product Selector */}
        <div className="col-span-4">
          <ProductSelector
            products={productCommonDocs}
            selectedProductId={selectedProductId}
            onSelectProduct={setSelectedProductId}
          />
        </div>

        {/* Right Panel: Conversion List */}
        <div className="col-span-8">
          {selectedProductId && selectedProduct ? (
            <ConversionList
              conversions={conversions}
              productName={`${selectedProduct.productCode} - ${selectedProduct.description}`}
              onSave={handleSaveConversion}
            />
          ) : (
            <div className="flex items-center justify-center h-[600px] border-2 border-dashed border-muted rounded-lg">
              <p className="text-muted-foreground">
                Select a product to manage conversions
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
