"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { authSelect } from "@/app/auth/authSlice";
import { inventorySelect } from "@/app/inventory/inventorySelect";
import { useInventory } from "@/app/inventory/useInventory";
import { useInventoryDeps } from "@/app/inventory/useInventoryDeps";
import { ProductListRow } from "@/app/inventory/_components/ProductListRow";
import { DateRangeSearchControl } from "@/app/inventory/_components/DateRangeSearchControl";
import { AddFromPrevInventorySheet } from "@/app/inventory/_components/AddFromPrevInventorySheet";
import { AddManualSheet } from "@/app/inventory/_components/AddManualSheet";
import { SaveInventoryButton } from "@/app/inventory/_components/SaveInventoryButton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { InventoryPrediction } from "@/app/inventory/InventoryTypes";

type ProductListAccordionProps = {
  activeProducts: ProductCommon[];
  predictionMap: Map<number, InventoryPrediction>;
};

function ProductListAccordion({ activeProducts, predictionMap }: ProductListAccordionProps) {
  // Group by category, sort categories and products alphabetically
  const byCategory = new Map<string, ProductCommon[]>();
  for (const product of activeProducts) {
    const cat = product.category || "Uncategorized";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(product);
  }
  // Sort products within each category
  byCategory.forEach((products) =>
    products.sort((a, b) => a.description.localeCompare(b.description)),
  );
  const sortedCategories = Array.from(byCategory.keys()).sort();

  return (
    <Accordion type="multiple" defaultValue={sortedCategories} className="px-0">
      {sortedCategories.map((category) => (
        <AccordionItem key={category} value={category}>
          <AccordionTrigger className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
            {category} ({byCategory.get(category)!.length})
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <ul>
              {byCategory.get(category)!.map((product) => (
                <li key={product.productId}>
                  <ProductListRow
                    product={product}
                    prediction={predictionMap.get(product.productId)}
                  />
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default function InventoryPage() {
  useInventoryDeps();

  const role = useSelector(authSelect.role);
  const router = useRouter();

  // Admin gate
  useEffect(() => {
    if (role && role !== "admin") {
      router.replace("/");
    }
  }, [role, router]);

  const activeProducts = useSelector(inventorySelect.activeProducts);
  const predictions = useSelector(inventorySelect.predictions);
  const productIdsFromServices = useSelector(inventorySelect.productIdsFromServices);
  const session = useSelector(inventorySelect.session);
  const { addProduct } = useInventory();

  // Build a prediction map for O(1) lookup in ProductListRow
  const predictionMap = new Map(predictions.map((p) => [p.productId, p]));

  // Auto-populate products discovered from services in the date range.
  // Uses productIdsFromServices (independent of activeProductIds) to avoid
  // the chicken-and-egg problem where predictions require active products.
  useEffect(() => {
    for (const productId of productIdsFromServices) {
      if (!session.activeProductIds.includes(productId)) {
        addProduct(productId);
      }
    }
  }, [productIdsFromServices, session.activeProductIds, addProduct]);

  if (role && role !== "admin") {
    return null;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card flex flex-col gap-3">
        <h1 className="text-base font-semibold">Inventory</h1>

        {/* Date range search */}
        <DateRangeSearchControl />

        {/* Add product triggers */}
        <div className="flex items-center gap-2">
          <AddFromPrevInventorySheet />
          <AddManualSheet />
        </div>
      </div>

      {/* Scrollable product list */}
      <div className="flex-1 overflow-y-auto">
        {activeProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No products added yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Search a date range to auto-populate, or use Prev. Inv / Manual to add products.
            </p>
          </div>
        ) : (
          <ProductListAccordion
            activeProducts={activeProducts}
            predictionMap={predictionMap}
          />
        )}
      </div>

      {/* Sticky footer save button (rendered via FooterPortal inside SaveInventoryButton) */}
      <SaveInventoryButton />
    </div>
  );
}
