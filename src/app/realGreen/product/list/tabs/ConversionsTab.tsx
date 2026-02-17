"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { ProductSelector } from "./components/ProductSelector";
import { ConversionList } from "./components/ConversionList";
import { ConversionEditor } from "./components/ConversionEditor";
import { useUnitConfig } from "@/app/realGreen/product/_lib/hooks/useUnitConfig";
import {
  UnitConversion,
  createDefaultAppConversion,
} from "@/app/realGreen/product/_lib/types/ProductUnitConfigTypes";
import {
  getMetricForUL,
} from "@/app/realGreen/product/_lib/types/UnitTypes";
import { Alert, AlertDescription } from "@/style/components/alert";
import { Info } from "lucide-react";
import { unitConfigSelect } from "@/app/realGreen/product/_lib/selectors/unitConfigSelectors";

export default function ConversionsTab() {
  const productCommonDocs = useSelector(productSelect.productCommonDocs);
  const productCommonDocMap = useSelector(productSelect.productCommonDocMap);
  const unitConfigsByProductId = useSelector(unitConfigSelect.unitConfigMap);

  const { saveConfig, deleteConfig } = useUnitConfig({});

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingConversion, setEditingConversion] = useState<{
    conversion: UnitConversion;
    index: number;
  } | null>(null);
  const [editorMode, setEditorMode] = useState<"add" | "edit">("add");

  const selectedProduct = selectedProductId
    ? productCommonDocMap.get(selectedProductId)
    : null;

  const currentConfig = selectedProductId
    ? unitConfigsByProductId.get(selectedProductId)
    : null;

  const conversions = currentConfig?.conversions || [];

  const baseMetric = selectedProduct
    ? getMetricForUL(selectedProduct.unit.desc)
    : "unknown";

  const handleAddConversion = () => {
    setEditingConversion(null);
    setEditorMode("add");
    setEditorOpen(true);
  };

  const handleEditConversion = (conversion: UnitConversion, index: number) => {
    setEditingConversion({ conversion, index });
    setEditorMode("edit");
    setEditorOpen(true);
  };

  const handleDeleteConversion = async (index: number) => {
    if (!selectedProductId) return;

    const updatedConversions = conversions.filter((_, i) => i !== index);

    try {
      if (updatedConversions.length === 0) {
        // If no conversions left, delete the entire config
        await deleteConfig(selectedProductId);
      } else {
        // Otherwise save with updated conversions
        await saveConfig({
          productId: selectedProductId,
          conversions: updatedConversions,
        });
      }
    } catch (error) {
      console.error("Failed to delete conversion", error);
    }
  };

  const handleSaveConversion = async (newConversion: UnitConversion) => {
    if (!selectedProductId || !selectedProduct) return;

    let updatedConversions: UnitConversion[];

    if (editorMode === "add") {
      // Check if conversion for this context already exists
      const existingIndex = conversions.findIndex(
        (conv) => conv.context === newConversion.context,
      );

      if (existingIndex >= 0) {
        // Replace existing conversion for this context
        updatedConversions = conversions.map((conv, i) =>
          i === existingIndex ? newConversion : conv,
        );
      } else {
        // Add new conversion
        updatedConversions = [...conversions, newConversion];
      }
    } else if (editingConversion !== null) {
      // Edit existing conversion
      updatedConversions = conversions.map((conv, i) =>
        i === editingConversion.index ? newConversion : conv,
      );
    } else {
      return;
    }

    // Ensure app context conversion exists
    const hasAppConversion = updatedConversions.some(
      (conv) => conv.context === "app",
    );
    if (!hasAppConversion) {
      updatedConversions.unshift(
        createDefaultAppConversion(selectedProduct.unit.desc, baseMetric),
      );
    }

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
              onAdd={handleAddConversion}
              onEdit={handleEditConversion}
              onDelete={handleDeleteConversion}
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

      {/* Conversion Editor Sheet */}
      {selectedProductId && (
        <ConversionEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          conversion={editingConversion?.conversion || null}
          baseMetric={baseMetric}
          product={selectedProduct || null}
          onSave={handleSaveConversion}
          mode={editorMode}
        />
      )}
    </div>
  );
}
