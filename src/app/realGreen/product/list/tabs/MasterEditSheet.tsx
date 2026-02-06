"use client";

import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/productSelectors";
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
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";

interface MasterEditSheetProps {
  master: ProductMaster | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MasterEditSheet({
  master,
  open,
  onOpenChange,
}: MasterEditSheetProps) {
  const productSubs = useSelector(productSelect.productSubs);
  const [selectedSubIds, setSelectedSubIds] = React.useState<number[]>(
    master?.subProductIds || [],
  );

  // Filter cores to show only products that can be subs
  // (isProduction=true, isMobile=false)
  const availableSubs = productSubs.filter(
    (doc) => doc.isProduction && !doc.isMobile,
  );

  const toggleSub = (productId: number) => {
    setSelectedSubIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const handleSave = () => {
    // TODO: Implement save logic (Redux action + API call)
    console.log(
      "Saving master:",
      master?.productId,
      "with subs:",
      selectedSubIds,
    );
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset to original state
    if (master) {
      setSelectedSubIds(master.subProductIds);
    }
    onOpenChange(false);
  };

  if (!master) return null;

  return (
    <Sheet key={master.productId} open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle>Edit Master Product</SheetTitle>
          <SheetDescription>
            Configure sub-products for this master product
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

          {/* Sub-Products Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Sub-Products ({selectedSubIds.length} selected)
              </Label>
              {selectedSubIds.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSubIds([])}
                >
                  Clear All
                </Button>
              )}
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
                        checked={selectedSubIds.includes(sub.productId)}
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
                        <div className="text-xs text-muted-foreground">
                          Category: {sub.category}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
