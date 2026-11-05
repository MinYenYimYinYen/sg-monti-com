"use client";

import { shallowEqual, useSelector } from "react-redux";
import { AlertTriangle } from "lucide-react";
import { AppState } from "@/store";
import { Checkbox } from "@/style/components/checkbox";
import { importDecisionSelect } from "@/app/qbo/importCCTxn/decisions/importDecisionSelect";
import { useImportDecision } from "@/app/qbo/importCCTxn/decisions/useImportDecision";

/**
 * Offered when the vendor on a row was filled in and nobody has confirmed it for this exact
 * description: either another row's pick put it here, or a saved mapping covers a similar
 * description. Ticking it adds the description to the merchant's confirmed list when the draft
 * is saved. It never blocks Save.
 */
export function InferredConfirmCheckbox({ rowId }: { rowId: string }) {
  const view = useSelector(
    (state: AppState) => importDecisionSelect.rowView(state, rowId),
    shallowEqual,
  );
  const { setRowConfirmed } = useImportDecision();

  if (!view || !view.canConfirmVendor) return null;

  const explanation =
    view.vendorSource === "inferred"
      ? "Vendor inferred from another transaction. Tick to confirm it."
      : "Vendor filled in from a similar description. Tick when it looks right.";

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-secondary">
      <Checkbox
        checked={view.isVendorConfirmed}
        onCheckedChange={(checked) =>
          setRowConfirmed({
            rowId,
            merchantKey: view.merchantKey,
            vendorId: view.vendorId,
            isConfirmed: checked === true,
          })
        }
        aria-label="Confirm the vendor for this transaction"
      />
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {explanation}
    </label>
  );
}
