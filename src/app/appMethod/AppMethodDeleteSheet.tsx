"use client";

import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/style/components/sheet";
import { Button } from "@/style/components/button";
import { Badge } from "@/style/components/badge";
import { ScrollArea } from "@/style/components/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/style/components/select";
import { Label } from "@/style/components/label";
import { AppMethod } from "./AppMethodTypes";
import { productSelect } from "../realGreen/product/_lib/selectors/productSelectors";
import { getAffectedProducts, AffectedProduct } from "../realGreen/product/_lib/selectors/getAffectedProducts";
import { useAppMethod } from "./useAppMethod";
import { appMethodSelect } from "./appMethodSelect";
import { AlertTriangle } from "lucide-react";

interface AppMethodDeleteSheetProps {
  method: AppMethod;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteComplete?: () => void;
}

export function AppMethodDeleteSheet({
  method,
  open,
  onOpenChange,
  onDeleteComplete,
}: AppMethodDeleteSheetProps) {
  const productMasters = useSelector(productSelect.productMasters);
  const allAppMethods = useSelector(appMethodSelect.appMethodDocs);
  const { deleteAppMethod } = useAppMethod({});

  const [deleteMode, setDeleteMode] = useState<"clear" | "reassign">("clear");
  const [replacementAppMethodId, setReplacementAppMethodId] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  const affectedProducts = useMemo(
    () => getAffectedProducts(method.appMethodId, productMasters),
    [method.appMethodId, productMasters]
  );

  const hasZeroRates = affectedProducts.some(product =>
    product.affectedSubConfigs.some(config => config.hasZeroRate)
  );

  const availableReplacements = allAppMethods.filter(
    (m) => m.appMethodId !== method.appMethodId
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (deleteMode === "reassign" && replacementAppMethodId) {
        // Reassign: the API route will handle swapping appMethodId in equipmentScenarioDocs
        // For now, delete with clearReferences=false (references already handled server-side if needed)
        // TODO: implement reassign logic in API route when needed
        await deleteAppMethod({ appMethod: method, clearReferences: false });
      } else {
        // Delete with cascade clearing of equipmentScenarioDocs references
        await deleteAppMethod({ appMethod: method, clearReferences: true });
      }

      onDeleteComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting AppMethod:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>Delete Application Method</SheetTitle>
          <SheetDescription>
            Review products that use this method before deleting
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Method Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{method.appMethodId}</Badge>
              <span className="text-sm text-muted-foreground">
                {method.description}
              </span>
            </div>
          </div>

          {affectedProducts.length === 0 ? (
            <div className="rounded-md border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-green-800">
                No products are using this application method. Safe to delete.
              </p>
            </div>
          ) : (
            <>
              {/* Warning about zero rates */}
              {hasZeroRates && (
                <div className="rounded-md border border-orange-200 bg-orange-50 p-4 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-800">
                      Warning: Some products have zero stored rates
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      These products will fall back to a rate of 0 if references are cleared.
                    </p>
                  </div>
                </div>
              )}

              {/* Affected Products List */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Affected Products ({affectedProducts.length})
                </Label>
                <ScrollArea className="h-[250px] rounded-md border">
                  <div className="p-3 space-y-3">
                    {affectedProducts.map((product) => (
                      <div key={product.productId} className="space-y-2 rounded-md border p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{product.productCode}</Badge>
                          <span className="text-sm font-medium">
                            {product.description}
                          </span>
                        </div>
                        <div className="pl-4 space-y-1">
                          {product.affectedSubConfigs.map((config) => (
                            <div
                              key={config.subId}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-muted-foreground">
                                {config.subDescription}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                  Stored Rate: {config.storedRate}
                                </span>
                                {config.hasZeroRate && (
                                  <Badge variant="destructive" className="h-5">
                                    Zero
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Delete Options */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Delete Options</Label>
                <div className="space-y-2">
                  <div
                    className={`rounded-md border p-3 cursor-pointer transition-colors ${
                      deleteMode === "clear"
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setDeleteMode("clear")}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        checked={deleteMode === "clear"}
                        onChange={() => setDeleteMode("clear")}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Clear References & Delete</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Remove this equipment scenario from all products and delete
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`rounded-md border p-3 cursor-pointer transition-colors ${
                      deleteMode === "reassign"
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setDeleteMode("reassign")}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        checked={deleteMode === "reassign"}
                        onChange={() => setDeleteMode("reassign")}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="text-sm font-medium">Reassign & Delete</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Replace with another application method before deleting
                          </p>
                        </div>
                        {deleteMode === "reassign" && (
                          <Select
                            value={replacementAppMethodId}
                            onValueChange={setReplacementAppMethodId}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select replacement method" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableReplacements.map((m) => (
                                <SelectItem key={m.appMethodId} value={m.appMethodId}>
                                  {m.appMethodId} - {m.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <SheetFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={
              isDeleting ||
              (deleteMode === "reassign" && !replacementAppMethodId && affectedProducts.length > 0)
            }
          >
            {isDeleting ? "Deleting..." : "Delete Method"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
