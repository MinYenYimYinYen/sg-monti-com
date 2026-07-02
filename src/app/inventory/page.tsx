"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { authSelect } from "@/app/auth/authSlice";
import { inventorySelect } from "@/app/inventory/inventorySelect";
import { inventoryActions } from "@/app/inventory/inventorySlice";
import { useInventory } from "@/app/inventory/useInventory";
import { useInventoryDeps } from "@/app/inventory/useInventoryDeps";
import { useAppDispatch } from "@/lib/hooks/redux";
import { ProductListRow } from "@/app/inventory/_components/ProductListRow";
import { SelectProductsSheet } from "@/app/inventory/_components/SelectProductsSheet";
import { SaveInventoryButton } from "@/app/inventory/_components/SaveInventoryButton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { InventoryPrediction, ProductCount } from "@/app/inventory/InventoryTypes";
import Link from "next/link";
import { ClipboardList, History } from "lucide-react";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

// ---------------------------------------------------------------------------
// Module-level persistence — survives component unmount/remount within the
// same browser session (e.g. navigating to a product page and back).
// ---------------------------------------------------------------------------

let savedScrollTop = 0;
let savedOpenCategories: string[] | null = null;

// ---------------------------------------------------------------------------

type ProductListAccordionProps = {
  activeProducts: ProductCommon[];
  predictionMap: Map<number, InventoryPrediction>;
  counts: Record<number, ProductCount[]>;
  openCategories: string[];
  onOpenChange: (categories: string[]) => void;
};

function ProductListAccordion({
  activeProducts,
  predictionMap,
  counts,
  openCategories,
  onOpenChange,
}: ProductListAccordionProps) {
  // Group by category, sort categories and products alphabetically
  const byCategory = new Map<string, ProductCommon[]>();
  for (const product of activeProducts) {
    const cat = product.category || "Uncategorized";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(product);
  }
  byCategory.forEach((products) =>
    products.sort((a, b) => a.description.localeCompare(b.description)),
  );
  const sortedCategories = Array.from(byCategory.keys()).sort();

  return (
    <Accordion
      type="multiple"
      value={openCategories}
      onValueChange={onOpenChange}
      className="px-0"
    >
      {sortedCategories.map((category) => {
        const products = byCategory.get(category)!;
        const total = products.length;
        const countedCount = products.filter(
          (p) => (counts[p.productId]?.length ?? 0) > 0,
        ).length;
        const allCounted = countedCount === total;

        return (
          <AccordionItem key={category} value={category}>
            <AccordionTrigger className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              <span className="flex items-center gap-1.5">
                {category}
                <span className={allCounted ? "text-accent" : ""}>
                  ({countedCount}/{total})
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              <ul>
                {products.map((product) => (
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
        );
      })}
    </Accordion>
  );
}

export default function InventoryPage() {
  useInventoryDeps();

  const dispatch = useAppDispatch();
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
  const session = useSelector(inventorySelect.session);
  const { loadCheckIntoSession } = useInventory();

  // Build a prediction map for O(1) lookup in ProductListRow
  const predictionMap = new Map(predictions.map((p) => [p.productId, p]));

  // When checks load in, auto-restore today's check into the session — but only
  // if it hasn't already been loaded (guarded by todayCheckLoaded flag in Redux).
  // This prevents re-running on every count addition and on component remounts.
  const checks = useSelector(inventorySelect.checks);
  const todayCheckLoaded = useSelector(inventorySelect.todayCheckLoaded);
  useEffect(() => {
    if (todayCheckLoaded) return;
    const today = dateStrings.today();
    const hasToday = checks.some((c) => c.checkDate === today);
    if (hasToday) {
      loadCheckIntoSession(today);
    } else {
      dispatch(inventoryActions.markTodayCheckLoaded());
    }
  }, [todayCheckLoaded, checks, loadCheckIntoSession, dispatch]);

  // ---------------------------------------------------------------------------
  // Accordion open state — initialized from saved state or all-open default
  // ---------------------------------------------------------------------------

  const sortedCategories = Array.from(
    new Set(activeProducts.map((p) => p.category || "Uncategorized")),
  ).sort();

  const categoriesKey = sortedCategories.join(",");

  const [openCategories, setOpenCategories] = useState<string[]>(
    savedOpenCategories ?? sortedCategories,
  );

  // When new categories appear (e.g. products added), open them by default
  React.useEffect(() => {
    setOpenCategories((prev) => {
      const newCats = sortedCategories.filter((c) => !prev.includes(c));
      if (newCats.length === 0) return prev;
      return [...prev, ...newCats];
    });
  }, [categoriesKey, sortedCategories]);

  const handleOpenChange = (categories: string[]) => {
    savedOpenCategories = categories;
    setOpenCategories(categories);
  };

  // ---------------------------------------------------------------------------
  // Scroll position save/restore
  // ---------------------------------------------------------------------------

  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore scroll position on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = savedScrollTop;
    }
  }, []);

  const handleScroll = () => {
    if (scrollRef.current) {
      savedScrollTop = scrollRef.current.scrollTop;
    }
  };

  if (role && role !== "admin") {
    return null;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-base font-semibold">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Inventory
        </span>
        <div className="flex items-center gap-2">
          <SelectProductsSheet />
          <Link
            href="/inventory/history"
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent/10"
            aria-label="View inventory history"
          >
            <History className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Scrollable product list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        {activeProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No products added yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Tap &ldquo;Select Products to Count&rdquo; to get started.
            </p>
          </div>
        ) : (
          <ProductListAccordion
            activeProducts={activeProducts}
            predictionMap={predictionMap}
            counts={session.counts}
            openCategories={openCategories}
            onOpenChange={handleOpenChange}
          />
        )}
      </div>

      {/* Sticky footer save button (rendered via FooterPortal inside SaveInventoryButton) */}
      <SaveInventoryButton />
    </div>
  );
}
