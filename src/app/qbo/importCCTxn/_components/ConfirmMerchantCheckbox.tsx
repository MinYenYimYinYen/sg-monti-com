"use client";

import { useSelector } from "react-redux";
import { AlertTriangle } from "lucide-react";
import { Checkbox } from "@/style/components/checkbox";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { importCCTxnCapabilities } from "@/app/qbo/importCCTxn/importCCTxnCapabilities";
import { importCCTxnMappingSelect } from "@/app/qbo/importCCTxn/importCCTxnMappingSelect";
import { importConfirmSelect } from "@/app/qbo/importCCTxn/importConfirmSelect";
import { useImportCCTxnMapping } from "@/app/qbo/importCCTxn/useImportCCTxnMapping";
import { isDescriptionConfirmed } from "@/app/qbo/importCCTxn/_lib/importConfirmUtils";
import { collapseDescription } from "@/app/qbo/importCCTxn/_lib/importMerchantKey";

/**
 * Marks a description that has a vendor pre-filled but that nobody has confirmed against that
 * vendor yet, with a checkbox to confirm it. Renders nothing when the description is confirmed or
 * the merchant has no mapping. It never blocks posting: it is a prompt to look. It reads the
 * confirmed descriptions from state, so ticking one updates every place that shows it.
 */
export function ConfirmMerchantCheckbox({
  merchantKey,
  description,
}: {
  merchantKey: string;
  description: string;
}) {
  const mapping = useSelector(importCCTxnMappingSelect.merchantMappingMap).get(merchantKey);
  const confirmedKeys = useSelector(importConfirmSelect.confirmedKeys);
  const canConfirm = useSelector(userCapabilitiesSelect.allows)(
    importCCTxnCapabilities.can.merchantMappings.write,
  );
  const { confirmMerchant } = useImportCCTxnMapping({ autoLoad: false });

  if (!mapping) return null;
  if (isDescriptionConfirmed({ confirmedKeys, merchantKey, description })) return null;

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-secondary">
      <Checkbox
        checked={false}
        disabled={!canConfirm}
        onCheckedChange={() =>
          confirmMerchant({ merchantKey, description: collapseDescription(description) })
        }
        aria-label={`Confirm ${description}`}
      />
      <AlertTriangle className="h-4 w-4 shrink-0" />
      Vendor filled in from a similar description. Tick when it looks right.
    </label>
  );
}
