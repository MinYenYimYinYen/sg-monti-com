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
import { EquipmentDoc } from "@/app/equipment/EquipmentTypes";
import { productSelect } from "../realGreen/product/_lib/selectors/productSelectors";
import { getAffectedProducts, AffectedProduct } from "../realGreen/product/_lib/selectors/getAffectedProducts";
import { useAppMethod } from "./useAppMethod";
import { appMethodSelect } from "./appMethodSelect";
import { AlertTriangle, XCircle } from "lucide-react";

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
  const { deleteAppMethod, checkAppMethodDependencies } = useAppMethod({});

  const [isDeleting, setIsDeleting] = useState(false);

  // Equipment dependency state (loaded from API)
  const [equipmentWithDefault, setEquipmentWithDefault] = useState<EquipmentDoc[]>([]);
  const [equipmentInAllowed, setEquipmentInAllowed] = useState<EquipmentDoc[]>([]);
  const [depsLoaded, setDepsLoaded] = useState(false);

  // Load equipment dependencies when sheet opens
  React.useEffect(() => {
    if (!open) {
      setDepsLoaded(false);
      setEquipmentWithDefault([]);
      setEquipmentInAllowed([]);
      return;
    }
    checkAppMethodDependencies(method.appMethodId).then((result: Awaited<ReturnType<typeof checkAppMethodDependencies>>) => {
      if (result) {
        setEquipmentWithDefault(result.equipmentWithDefault);
        setEquipmentInAllowed(result.equipmentInAllowed);
      }
      setDepsLoaded(true);
    });
  }, [open, method.appMethodId, checkAppMethodDependencies]);

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

  // Deletion is blocked if any equipment uses this as its default
  const isBlocked = depsLoaded && equipmentWithDefault.length > 0;

  const handleDelete = async () => {
    if (isBlocked) return;
    setIsDeleting(true);
    try {
      await deleteAppMethod({ appMethod: method, clearReferences: true });
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
            Review products and equipment that use this method before deleting
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Method Info */}
          <div className="flex items-center gap-2">
            <Badge variant="outline">{method.appMethodId}</Badge>
            <span className="text-sm text-muted-foreground">
              {method.description}
            </span>
          </div>

          {/* Blocking: equipment with this as default */}
          {depsLoaded && equipmentWithDefault.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Cannot delete — {equipmentWithDefault.length} equipment item
                    {equipmentWithDefault.length !== 1 ? "s" : ""} use this as their default
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reassign or delete these equipment items before deleting this method.
                  </p>
                </div>
              </div>
              <div className="pl-6 space-y-1">
                {equipmentWithDefault.map((e) => (
                  <div key={e.equipmentId} className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="font-mono">{e.equipmentId}</Badge>
                    <span className="text-muted-foreground">{e.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Non-blocking: equipment where this is in allowed list only */}
          {depsLoaded && equipmentInAllowed.length > 0 && (
            <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {equipmentInAllowed.length} equipment item
                    {equipmentInAllowed.length !== 1 ? "s" : ""} will lose this from their allowed list
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This method will be removed from their compatible methods list automatically.
                  </p>
                </div>
              </div>
              <div className="pl-6 space-y-1">
                {equipmentInAllowed.map((e) => (
                  <div key={e.equipmentId} className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="font-mono">{e.equipmentId}</Badge>
                    <span className="text-muted-foreground">{e.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Affected Products */}
          {affectedProducts.length === 0 && equipmentWithDefault.length === 0 && equipmentInAllowed.length === 0 && depsLoaded ? (
            <div className="rounded-md border border-accent/30 bg-accent/10 p-4">
              <p className="text-sm text-foreground">
                No products or equipment reference this method. Safe to delete.
              </p>
            </div>
          ) : affectedProducts.length > 0 && (
            <>
              {hasZeroRates && (
                <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-secondary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Warning: Some products have zero stored rates
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      These products will fall back to a rate of 0 if references are cleared.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Affected Products ({affectedProducts.length})
                </Label>
                <ScrollArea className="h-[200px] rounded-md border">
                  <div className="p-3 space-y-3">
                    {affectedProducts.map((product: AffectedProduct) => (
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
            disabled={isDeleting || isBlocked || !depsLoaded}
          >
            {isDeleting ? "Deleting…" : "Delete Method"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
