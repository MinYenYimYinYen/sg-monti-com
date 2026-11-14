"use client";

import { useState } from "react";
import { shallowEqual, useSelector } from "react-redux";
import { Plus } from "lucide-react";
import { Button } from "@/style/components/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/style/components/tooltip";
import { AppState } from "@/store";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import { qboVendorSelect } from "@/app/qbo/vendor/qboVendorSelect";
import { importMapSelect } from "@/app/qbo/importCCTxn/importMapSelect";
import { importCCTxnMappingSelect } from "@/app/qbo/importCCTxn/importCCTxnMappingSelect";
import { importDecisionSelect } from "@/app/qbo/importCCTxn/decisions/importDecisionSelect";
import { useImportDecision } from "@/app/qbo/importCCTxn/decisions/useImportDecision";
import {
  suggestVendorIds,
  suggestVendorIdsFromMappings,
} from "@/app/qbo/importCCTxn/_lib/importSuggestUtils";
import { OptionPicker } from "@/app/qbo/importCCTxn/_components/OptionPicker";
import { NewVendorDialog } from "@/app/qbo/importCCTxn/_components/NewVendorDialog";

/**
 * The vendor for one transaction. Picking one maps the whole merchant family, so the other rows
 * of the family show it at once. Nothing is saved until the Save button.
 */
export function MapRowVendorPicker({ rowId }: { rowId: string }) {
  const row = useSelector((state: AppState) => importDecisionSelect.pendingRow(state, rowId));
  const view = useSelector(
    (state: AppState) => importDecisionSelect.rowView(state, rowId),
    shallowEqual,
  );
  const vendorChoices = useSelector(importMapSelect.vendorChoices);
  const vendorMap = useSelector(qboVendorSelect.vendorMap);
  const merchantMappings = useSelector(importCCTxnMappingSelect.merchantMappings);
  // Creating a vendor writes to the live books, so it follows the QuickBooks vendor write.
  const canCreateVendor = useSelector(userCapabilitiesSelect.allows)(
    can.qboVendors.write,
  );
  const { pickVendor } = useImportDecision();
  const [isNewVendorOpen, setIsNewVendorOpen] = useState(false);

  if (!row || !view) return null;

  const suggestedVendorIds = new Set([
    ...suggestVendorIds({ vendors: vendorChoices, merchantKey: view.merchantKey }),
    ...suggestVendorIdsFromMappings({ merchantMappings, merchantKey: view.merchantKey }),
  ]);

  const choose = (vendorId: string) =>
    pickVendor({
      rowId,
      merchantKey: view.merchantKey,
      vendorId,
      storedVendorId: view.storedVendorId === "" ? null : view.storedVendorId,
    });

  return (
    <div className="flex min-w-52 items-center gap-2 xl:min-w-0">
      <OptionPicker
        className="w-full min-w-0 flex-1"
        options={vendorChoices.map((vendor) => ({ id: vendor.Id, label: vendor.DisplayName }))}
        suggestedIds={suggestedVendorIds}
        value={view.vendorId}
        selectedLabel={vendorMap.get(view.vendorId)?.DisplayName ?? null}
        placeholder="Vendor"
        onSelectAction={choose}
      />
      {canCreateVendor && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="primary"
                intensity="soft"
                size="icon"
                className="shrink-0"
                aria-label="New vendor"
                onClick={() => setIsNewVendorOpen(true)}
              >
                <Plus />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New vendor</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {isNewVendorOpen && (
        <NewVendorDialog
          merchantDescription={row.description}
          onUseVendorAction={(vendorId) => {
            choose(vendorId);
            setIsNewVendorOpen(false);
          }}
          onCloseAction={() => setIsNewVendorOpen(false)}
        />
      )}
    </div>
  );
}
