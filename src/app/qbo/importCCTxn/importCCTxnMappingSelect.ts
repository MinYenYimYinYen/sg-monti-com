import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { cardAssignmentKey } from "@/app/qbo/importCCTxn/_lib/importMappingUtils";

const selectAssignableUsers = (state: AppState) => state.importCCTxnMapping.assignableUsers;
const selectFormatAccounts = (state: AppState) => state.importCCTxnMapping.formatAccounts;
const selectCardAssignments = (state: AppState) => state.importCCTxnMapping.cardAssignments;
const selectMerchantMappings = (state: AppState) => state.importCCTxnMapping.merchantMappings;
const selectSkipRules = (state: AppState) => state.importCCTxnMapping.skipRules;

const selectFormatAccountMap = createSelector([selectFormatAccounts], (formatAccounts) =>
  new Grouper(formatAccounts).toUniqueMap((f) => f.formatId),
);

const selectCardAssignmentMap = createSelector([selectCardAssignments], (cardAssignments) =>
  new Grouper(cardAssignments).toUniqueMap((c) => cardAssignmentKey(c)),
);

// Only mappings that apply to everyone are keyed here. Per-user mappings are not built yet.
const selectMerchantMappingMap = createSelector([selectMerchantMappings], (merchantMappings) =>
  new Grouper(merchantMappings.filter((m) => m.ownerUserName === null)).toUniqueMap(
    (m) => m.merchantKey,
  ),
);

const selectSkipRuleMap = createSelector([selectSkipRules], (skipRules) =>
  new Grouper(skipRules).toUniqueMap((s) => s.merchantKey),
);

export const importCCTxnMappingSelect = {
  assignableUsers: selectAssignableUsers,
  formatAccounts: selectFormatAccounts,
  formatAccountMap: selectFormatAccountMap,
  cardAssignments: selectCardAssignments,
  cardAssignmentMap: selectCardAssignmentMap,
  merchantMappings: selectMerchantMappings,
  merchantMappingMap: selectMerchantMappingMap,
  skipRules: selectSkipRules,
  skipRuleMap: selectSkipRuleMap,
};
