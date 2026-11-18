"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Badge } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { MnTaxTypePicker } from "@/app/salesTax/salesTaxMapping/_components/MnTaxTypePicker";
import { NewMnTaxTypeForm } from "@/app/salesTax/salesTaxMapping/_components/NewMnTaxTypeForm";
import { SelectedMnTaxTypes } from "@/app/salesTax/salesTaxMapping/_components/SelectedMnTaxTypes";
import { salesTaxMappingSelect } from "@/app/salesTax/salesTaxMapping/salesTaxMappingSelect";
import { useSalesTaxMapping } from "@/app/salesTax/salesTaxMapping/useSalesTaxMapping";
import { MnTaxType } from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";
import {
  isSameMnTaxTypes,
  mergeMnTaxTypes,
  ratesMatch,
  sumRatePercent,
  toggleMnTaxType,
} from "@/app/salesTax/salesTaxMapping/_lib/mnTaxTypeLogic";

/**
 * The draft lives in local state and starts from the saved mapping; the parent keys this component
 * by tax code so opening another one starts a fresh draft. Nothing is stored until Save.
 */
export function SalesTaxMappingDialog({
  taxCodeId,
  onCloseAction,
}: {
  taxCodeId: string;
  onCloseAction: () => void;
}) {
  const rows = useSelector(salesTaxMappingSelect.rows);
  const knownMnTaxTypes = useSelector(salesTaxMappingSelect.knownMnTaxTypes);
  const { saveMapping } = useSalesTaxMapping({ autoLoad: false });

  const row = rows.find((candidate) => candidate.taxCodeId === taxCodeId);
  const savedMnTaxTypes = row?.mnTaxTypes ?? [];

  const [selected, setSelected] = useState<MnTaxType[]>(savedMnTaxTypes);
  const [isAdding, setIsAdding] = useState(false);

  // A type added in this dialog is not in the store until Save, so it is merged in to stay listed.
  const listedMnTaxTypes = mergeMnTaxTypes({ primary: knownMnTaxTypes, additional: selected });
  const takenCodes = new Set(listedMnTaxTypes.map((mnTaxType) => mnTaxType.code));

  const taxRate = row?.taxCode?.taxRate ?? null;
  const mappedPercent = sumRatePercent(selected);
  const isChanged = !isSameMnTaxTypes({ first: selected, second: savedMnTaxTypes });
  const isMatch = taxRate !== null && ratesMatch({ mappedPercent, taxRate });

  const toggle = (mnTaxType: MnTaxType) => {
    setSelected(toggleMnTaxType({ selected, mnTaxType }));
  };

  const handleSave = () => {
    saveMapping({ taxCodeId, mnTaxTypes: selected });
    onCloseAction();
  };

  const handleAddNew = (mnTaxType: MnTaxType) => {
    toggle(mnTaxType);
    setIsAdding(false);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCloseAction()}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            Map {taxCodeId}
            {taxRate !== null && ` (${taxRate}%)`}
          </DialogTitle>
          <DialogDescription>
            Choose the Minnesota tax types this RealGreen tax code files under. The chosen types are
            stored in full with the mapping.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm">
          <Badge variant="primary" intensity="soft">
            Selected {mappedPercent}%
          </Badge>
          {taxRate !== null && (
            <Badge variant="outline" intensity="ghost">
              RealGreen {taxRate}%
            </Badge>
          )}
          {taxRate !== null && selected.length > 0 && (
            <Badge variant={isMatch ? "accent" : "secondary"} intensity="soft">
              {isMatch ? "Rates match" : "Rates differ"}
            </Badge>
          )}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-5 gap-4 overflow-hidden">
          <div className="col-span-3 flex min-h-0 flex-col">
            <MnTaxTypePicker
              mnTaxTypes={listedMnTaxTypes}
              selected={selected}
              onToggleAction={toggle}
            />
          </div>
          <div className="col-span-2 flex min-h-0 flex-col">
            <SelectedMnTaxTypes selected={selected} onRemoveAction={toggle} />
          </div>
        </div>

        {isAdding ? (
          <NewMnTaxTypeForm
            takenCodes={takenCodes}
            onAddAction={handleAddNew}
            onCancelAction={() => setIsAdding(false)}
          />
        ) : (
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAdding(true)}>
              Add new definition
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCloseAction}>
            Cancel
          </Button>
          <Button type="button" disabled={!isChanged} onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
