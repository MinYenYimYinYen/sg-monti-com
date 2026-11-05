import { createSelector } from "@reduxjs/toolkit";
import { qboAccountSelect } from "@/app/qbo/account/qboAccountSelect";
import { qboVendorSelect } from "@/app/qbo/vendor/qboVendorSelect";
import { sortVendorsByName } from "@/app/qbo/vendor/_lib/qboVendorUtils";
import { pickActiveAccounts } from "@/app/qbo/importCCTxn/_lib/importAccountUtils";

// What the Map and Post tabs offer in their vendor and account dropdowns. What each Map row shows
// is in decisions/importDecisionSelect.

/** What the vendor dropdown offers: active vendors only, by name. */
const selectVendorChoices = createSelector([qboVendorSelect.activeVendors], sortVendorsByName);

/** What the account dropdown offers: active expense accounts only. */
const selectAccountChoices = createSelector([qboAccountSelect.expenseAccounts], pickActiveAccounts);

export const importMapSelect = {
  vendorChoices: selectVendorChoices,
  accountChoices: selectAccountChoices,
};
