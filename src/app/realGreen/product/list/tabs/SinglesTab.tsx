"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { TabInfo } from "./TabInfo";
import { ProductSelector } from "./components/ProductSelector";
import { SingleEditPanel } from "./components/SingleEditPanel";

export default function SinglesTab() {
  const singles = useSelector(productSelect.productSingles);
  const singlesMap = useSelector(productSelect.productSinglesMap);

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const selectedProduct = selectedProductId
    ? singlesMap.get(selectedProductId)
    : null;

  const productName = selectedProduct
    ? `${selectedProduct.productCode} - ${selectedProduct.description}`
    : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Single Products
          </h2>
          <TabInfo
            title="Singles"
            isProduction={true}
            isMobile={true}
            isMaster={false}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {singles.length} product{singles.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left Panel: Product Selector */}
        <div className="col-span-4">
          <ProductSelector
            products={singles}
            selectedProductId={selectedProductId}
            onSelectProduct={setSelectedProductId}
          />
        </div>

        {/* Right Panel: Edit Panel */}
        <div className="col-span-8">
          {selectedProduct ? (
            <SingleEditPanel
              key={selectedProduct.productId}
              product={selectedProduct}
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
