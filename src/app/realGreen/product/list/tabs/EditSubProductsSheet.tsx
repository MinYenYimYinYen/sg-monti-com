"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/style/components/sheet";
import { Button } from "@/style/components/button";
import { Badge } from "@/style/components/badge";
import { ScrollArea } from "@/style/components/scroll-area";
import { Checkbox } from "@/style/components/checkbox";
import { Label } from "@/style/components/label";
import { Input } from "@/style/components/input";
import {
  ProductMaster,
  SubProductConfigDoc,
} from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { SaveButton, SaveStatus } from "@/components/SaveButton";

interface MasterEditSheetProps {
  master: ProductMaster | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSubProductsSheet({
  master,
  open,
  onOpenChange,
}: MasterEditSheetProps) {
  const { updateMasterSubProducts } = useProduct({});
  const productSubs = useSelector(productSelect.productSubs);
  const [configDocs, setConfigDocs] = React.useState<SubProductConfigDoc[]>(
    master?.subProductConfigDocs || [],
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Filter cores to show only products that can be subs
  // (isProduction=true, isMobile=false)
  const availableSubs = productSubs
    .filter((doc) => doc.isProduction && !doc.isMobile)
    .filter((doc) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        doc.productCode.toLowerCase().includes(term) ||
        doc.description.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => a.productCode.localeCompare(b.productCode));

  const toggleSub = (productId: number) => {
    setConfigDocs((prev) =>
      prev.some((c) => c.subId === productId)
        ? prev.filter((c) => c.subId !== productId)
        : [...prev, { subId: productId, rate: 0 }],
    );
  };

  const updateRate = (productId: number, rate: number) => {
    setConfigDocs((prev) =>
      prev.map((c) => (c.subId === productId ? { ...c, rate } : c)),
    );
  };

  const [status, setStatus] = useState<SaveStatus>("idle");
  const handleSave = async () => {
    if (master) {
      try {
        await updateMasterSubProducts({
          masterId: master.productId,
          subProductConfigDocs: configDocs,
        });
        setStatus("success");
      } catch (e) {
        console.error("Error updating master sub-products:", e);
      }
    }
  };

  const handleCancel = () => {
    // Reset to original state
    if (master) {
      setConfigDocs(master.subProductConfigDocs);
    }
    onOpenChange(false);
  };

  if (!master) return null;

  return (
    <Sheet key={master.productId} open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[800px]">
        <SheetHeader>
          <SheetTitle>Edit Master Product</SheetTitle>
          <SheetDescription>
            Configure sub-products and rates for this master product
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Master Product Info */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Master Product</div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{master.productCode}</Badge>
                <span className="text-sm font-medium">
                  {master.description}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Category ID: {master.categoryId}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Sub-Products Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">
                  Available Sub-Products
                </Label>
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8"
                />
              </div>
              <ScrollArea className="h-[400px] rounded-md border">
                <div className="p-4 space-y-2">
                  {availableSubs.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No available sub-products found
                    </div>
                  ) : (
                    availableSubs.map((sub) => (
                      <div
                        key={sub.productId}
                        className="flex items-center space-x-3 rounded-md border p-3 hover:bg-accent/10 cursor-pointer"
                        onClick={() => toggleSub(sub.productId)}
                      >
                        <Checkbox
                          checked={configDocs.some(
                            (c) => c.subId === sub.productId,
                          )}
                          onCheckedChange={() => toggleSub(sub.productId)}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground">
                              {sub.productCode}
                            </span>
                            <span className="text-sm font-medium">
                              {sub.description}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Selected Sub-Products & Rates */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Selected ({configDocs.length})
                </Label>
                {configDocs.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfigDocs([])}
                  >
                    Clear All
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[400px] rounded-md border">
                <div className="p-4 space-y-2">
                  {configDocs.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No sub-products selected
                    </div>
                  ) : (
                    configDocs.map((config) => {
                      const sub = availableSubs.find(
                        (s) => s.productId === config.subId,
                      );
                      return (
                        <div
                          key={config.subId}
                          className="space-y-2 rounded-md border p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {sub?.description || `Sub ID: ${config.subId}`}
                            </span>
                            <Button
                              variant="outline"
                              intensity={"ghost"}
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleSub(config.subId)}
                            >
                              ✕
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">
                              Rate:
                            </Label>
                            <Input
                              type="number"
                              className="h-8"
                              value={config.rate}
                              onChange={(e) =>
                                updateRate(
                                  config.subId,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <SaveButton
            onClick={handleSave}
            status={status}
            onSuccessComplete={() => {
              onOpenChange(false);
              setStatus("idle");
            }}
          >
            Save Changes
          </SaveButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
