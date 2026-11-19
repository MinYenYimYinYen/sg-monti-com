"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/style/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";
import { MnTaxType } from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";

/**
 * A button that opens a list of Minnesota tax types and hands the chosen one up. It knows nothing
 * about groups, so "start a group" and "add to this group" share it.
 */
export function MnTaxTypePickerPopover({
  label,
  mnTaxTypes,
  disabled,
  onPickAction,
}: {
  label: string;
  mnTaxTypes: MnTaxType[];
  disabled: boolean;
  onPickAction: (mnTaxType: MnTaxType) => void;
}) {
  const [open, setOpen] = useState(false);

  const handlePick = (mnTaxType: MnTaxType) => {
    onPickAction(mnTaxType);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={disabled}>
          {label}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-1" align="start">
        {mnTaxTypes.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            Every mapped Minnesota tax type is already in a group.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {mnTaxTypes.map((mnTaxType) => (
              <button
                key={mnTaxType.code}
                type="button"
                onClick={() => handlePick(mnTaxType)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-primary/10"
              >
                <span className="w-9 shrink-0 font-mono">{mnTaxType.code}</span>
                <span className="flex-1 truncate">{mnTaxType.description}</span>
                <span className="tabular-nums text-muted-foreground">
                  {mnTaxType.ratePercent}%
                </span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
