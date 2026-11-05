import { createSelector } from "@reduxjs/toolkit";
import { qboAccountSelect } from "@/app/qbo/account/qboAccountSelect";
import { qboVendorSelect } from "@/app/qbo/vendor/qboVendorSelect";
import { sortVendorsByName } from "@/app/qbo/vendor/_lib/qboVendorUtils";
import { importRowSelect } from "@/app/qbo/importCCTxn/rows/importRowSelect";
import { importCCTxnMappingSelect } from "@/app/qbo/importCCTxn/importCCTxnMappingSelect";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import {
  buildMerchantGroups,
  pickActiveAccounts,
} from "@/app/qbo/importCCTxn/_lib/importMapUtils";

// Selectors for the Map tab: pending rows, mappings, skip rules and the QuickBooks vendors and
// accounts, merged in one place so the components only read the result.

const selectMerchantGroups = createSelector(
  [
    importRowSelect.pendingRows,
    importCCTxnMappingSelect.merchantMappingMap,
    importCCTxnMappingSelect.skipRuleMap,
    qboVendorSelect.vendorMap,
    qboAccountSelect.accountMap,
  ],
  (pendingRows, merchantMappingMap, skipRuleMap, vendorMap, accountMap) =>
    buildMerchantGroups({ pendingRows, merchantMappingMap, skipRuleMap, vendorMap, accountMap }),
);

const selectMerchantGroupMap = createSelector([selectMerchantGroups], (merchantGroups) =>
  new Grouper(merchantGroups).toUniqueMap((group) => group.merchantKey),
);

const selectUnmappedCount = createSelector(
  [selectMerchantGroups],
  (merchantGroups) => merchantGroups.filter((group) => group.status !== "mapped").length,
);

/** What the vendor dropdown offers: active vendors only, by name. */
const selectVendorChoices = createSelector([qboVendorSelect.activeVendors], sortVendorsByName);

/** What the account dropdown offers: active expense accounts only. */
const selectAccountChoices = createSelector([qboAccountSelect.expenseAccounts], pickActiveAccounts);

export const importMapSelect = {
  merchantGroups: selectMerchantGroups,
  merchantGroupMap: selectMerchantGroupMap,
  unmappedCount: selectUnmappedCount,
  vendorChoices: selectVendorChoices,
  accountChoices: selectAccountChoices,
};
