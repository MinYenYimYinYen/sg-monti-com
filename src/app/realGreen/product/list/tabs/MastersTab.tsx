"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { MasterEditPanel } from "./masters/MasterEditPanel";
import { Input } from "@/style/components/input";
import { ScrollArea } from "@/style/components/scroll-area";
import { Badge } from "@/style/components/badge";
import { Search } from "lucide-react";
import { cn } from "@/style/utils";

export default function MastersTab() {
  const masters = useSelector(productSelect.productMasters);
  const mastersMap = useSelector(productSelect.productMastersMap);

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedProduct = selectedProductId ? mastersMap.get(selectedProductId) : null;

  const filteredMasters = masters
    .filter((m) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.productCode.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        String(m.productId).includes(q)
      );
    })
    .sort((a, b) => a.productCode.localeCompare(b.productCode));

  return (
    <div className="flex gap-4" style={{ height: "calc(100vh - 200px)" }}>
      {/* ── Left: listbox ── */}
      <div className="w-72 shrink-0 flex flex-col gap-2 h-full">
        {/* Search */}
        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* List */}
        <ScrollArea className="rounded-md border bg-popover" style={{ height: "calc(100% - 44px)" }}>
          <div className="p-1 space-y-0.5">
            {filteredMasters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No products found
              </p>
            ) : (
              filteredMasters.map((master) => (
                <button
                  key={master.productId}
                  onClick={() => setSelectedProductId(master.productId)}
                  className={`w-full text-left px-2.5 py-2 rounded-md transition-colors ${
                    selectedProductId === master.productId
                      ? "bg-primary/15 border border-primary/30"
                      : "hover:bg-accent/10 border border-transparent"
                  }`}
                >
                  {/* Line 1: id · code · description */}
                  <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                    <span className="font-mono w-4">{master.productId}</span>
                    <span className="font-mono shrink-0">{master.productCode}</span>
                    <span className="truncate text-foreground">{master.description}</span>
                  </div>
                  {/* Line 2: badges */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge
                      variant="secondary"
                      intensity="soft"
                      // className="text-[10px] px-1.5 py-0 h-4 bg-secondary/30 font-normal"
                      className={cn("text-[10px] px-1.5 py-0 h-4 bg-secondary/30 font-normal",
                      master.equipmentPackages.length === 0 && "bg-muted/30 text-muted-foreground"
                      )}
                    >
                      Pkg: {master.equipmentPackages.length}
                    </Badge>
                    <Badge
                      // className="text-[10px] px-1.5 py-0 h-4 bg-secondary/30 font-normal"
                      variant="secondary"
                      intensity={"soft"}
                      className={cn("text-[10px] px-1.5 py-0 h-4 bg-secondary/30 font-normal",
                      master.subProductConfigs.length === 0 && "bg-muted/30 text-muted-foreground"
                      )}
                    >

                      Sub: {master.subProductConfigs.length}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Right: edit panel or empty state ── */}
      <div className="flex-1 min-w-0">
        {selectedProduct ? (
          <MasterEditPanel
            key={selectedProduct.productId}
            master={selectedProduct}
            productName={`${selectedProduct.productCode} — ${selectedProduct.description}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground">Select a product to edit its configuration</p>
          </div>
        )}
      </div>
    </div>
  );
}
