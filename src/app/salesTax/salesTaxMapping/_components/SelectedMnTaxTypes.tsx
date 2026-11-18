"use client";

import { X } from "lucide-react";
import { Button } from "@/style/components/button";
import { MnTaxType } from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";

/** The chosen types, each removable. Generic: it knows nothing about where the selection lives. */
export function SelectedMnTaxTypes({
  selected,
  onRemoveAction,
}: {
  selected: MnTaxType[];
  onRemoveAction: (mnTaxType: MnTaxType) => void;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <p className="text-sm font-medium">Selected ({selected.length})</p>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border bg-card">
        {selected.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">
            Nothing selected. Saving like this leaves the tax code unmapped.
          </p>
        )}
        {selected.map((mnTaxType) => (
          <div key={mnTaxType.code} className="flex items-center gap-2 px-3 py-1.5 text-sm">
            <span className="w-9 shrink-0 font-mono">{mnTaxType.code}</span>
            <span className="flex-1">{mnTaxType.description}</span>
            <span className="tabular-nums">{mnTaxType.ratePercent}%</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => onRemoveAction(mnTaxType)}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {mnTaxType.code}</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
