"use client";

import { useState } from "react";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { MnJurisdiction, MnTaxType } from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";
import {
  MN_JURISDICTIONS,
  MN_JURISDICTION_LABELS,
} from "@/app/salesTax/salesTaxMapping/_lib/mnTaxTypeLogic";
import {
  EMPTY_NEW_MN_TAX_TYPE_INPUT,
  NewMnTaxTypeInput,
  validateNewMnTaxType,
} from "@/app/salesTax/salesTaxMapping/_lib/mnTaxTypeValidation";

/**
 * A generic form: it validates and hands the new type up, and knows nothing about the mapping it
 * ends up in, so it stays a callback component.
 */
export function NewMnTaxTypeForm({
  takenCodes,
  onAddAction,
  onCancelAction,
}: {
  takenCodes: ReadonlySet<string>;
  onAddAction: (mnTaxType: MnTaxType) => void;
  onCancelAction: () => void;
}) {
  const [input, setInput] = useState<NewMnTaxTypeInput>(EMPTY_NEW_MN_TAX_TYPE_INPUT);
  const [message, setMessage] = useState<string | null>(null);

  const setField = (changes: Partial<NewMnTaxTypeInput>) => {
    setInput({ ...input, ...changes });
    setMessage(null);
  };

  const handleAdd = () => {
    const result = validateNewMnTaxType({ input, takenCodes });
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    onAddAction(result.mnTaxType);
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-3">
      <p className="text-sm font-medium">New tax type definition</p>
      <div className="grid grid-cols-4 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newMnTaxTypeCode">Code</Label>
          <Input
            id="newMnTaxTypeCode"
            value={input.code}
            inputMode="numeric"
            maxLength={3}
            placeholder="e.g. 695"
            onChange={(event) => setField({ code: event.target.value })}
          />
        </div>
        <div className="col-span-3 flex flex-col gap-1.5">
          <Label htmlFor="newMnTaxTypeDescription">Description</Label>
          <Input
            id="newMnTaxTypeDescription"
            value={input.description}
            placeholder="e.g. Northfield Sales"
            onChange={(event) => setField({ description: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newMnTaxTypeRate">Rate %</Label>
          <Input
            id="newMnTaxTypeRate"
            value={input.ratePercent}
            inputMode="decimal"
            placeholder="0.5"
            onChange={(event) => setField({ ratePercent: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newMnTaxTypeFips">FIPS (optional)</Label>
          <Input
            id="newMnTaxTypeFips"
            value={input.fipsCode}
            onChange={(event) => setField({ fipsCode: event.target.value })}
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label>Jurisdiction</Label>
          <Select
            variant="shadcnDefault"
            value={input.jurisdiction}
            onValueChange={(value) => setField({ jurisdiction: value as MnJurisdiction })}
          >
            <SelectTrigger variant="shadcnDefault">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MN_JURISDICTIONS.map((jurisdiction) => (
                <SelectItem key={jurisdiction} value={jurisdiction}>
                  {MN_JURISDICTION_LABELS[jurisdiction]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {message && <p className="text-sm text-destructive">{message}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancelAction}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleAdd}>
          Add to this mapping
        </Button>
      </div>
    </div>
  );
}
