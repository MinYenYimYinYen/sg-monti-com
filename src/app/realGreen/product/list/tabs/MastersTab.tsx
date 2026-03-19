"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { TabInfo } from "./TabInfo";
import { ProductSelector } from "./components/ProductSelector";
import { MasterEditPanel } from "./components/MasterEditPanel";

export default function MastersTab() {
  const masters = useSelector(productSelect.productMasters);
  const mastersMap = useSelector(productSelect.productMastersMap);

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const selectedProduct = selectedProductId
    ? mastersMap.get(selectedProductId)
    : null;

  const productName = selectedProduct
    ? `${selectedProduct.productCode} - ${selectedProduct.description}`
    : "";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Master Products
          </h2>
          <TabInfo
            title="Masters"
            isProduction={true}
            isMobile={true}
            isMaster={true}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {masters.length} product{masters.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left Panel: Product Selector */}
        <div className="col-span-4">
          <ProductSelector
            products={masters}
            selectedProductId={selectedProductId}
            onSelectProduct={setSelectedProductId}
          />
        </div>

        {/* Right Panel: Edit Panel */}
        <div className="col-span-8">
          {selectedProduct ? (
            <MasterEditPanel
              key={selectedProduct.productId}
              master={selectedProduct}
              productName={productName}
            />
          ) : (
            <div className="flex items-center justify-center h-[600px] border-2 border-dashed border-muted rounded-lg">
              <p className="text-muted-foreground">
                Select a product to edit its attributes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
