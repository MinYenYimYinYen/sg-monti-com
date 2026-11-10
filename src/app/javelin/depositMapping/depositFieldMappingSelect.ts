import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { qboAccountSelect } from "@/app/qbo/account/qboAccountSelect";
import { qboCustomerSelect } from "@/app/qbo/customer/qboCustomerSelect";
import { resolveDepositFieldLinks } from "@/app/javelin/depositMapping/depositFieldLinks";
import { DEPOSIT_FIELDS } from "@/app/javelin/_lib/depositFields";
import { CK_DEPOSIT_LINK_KEYS } from "@/app/javelin/_lib/ckDepositFields";

const selectMappingDocs = (state: AppState) => state.depositFieldMapping.mappingDocs;

/** The WorkWave export columns. */
const selectDepositFieldLinks = createSelector(
  [selectMappingDocs, qboAccountSelect.accountMap, qboCustomerSelect.customerMap],
  (mappingDocs, qboAccountMap, customerMap) =>
    resolveDepositFieldLinks({ keys: DEPOSIT_FIELDS, mappingDocs, qboAccountMap, customerMap }),
);

/** The two accounts a check deposit moves money between. */
const selectCkDepositLinks = createSelector(
  [selectMappingDocs, qboAccountSelect.accountMap, qboCustomerSelect.customerMap],
  (mappingDocs, qboAccountMap, customerMap) =>
    resolveDepositFieldLinks({
      keys: CK_DEPOSIT_LINK_KEYS,
      mappingDocs,
      qboAccountMap,
      customerMap,
    }),
);

export const depositFieldMappingSelect = {
  mappingDocs: selectMappingDocs,
  links: selectDepositFieldLinks,
  ckLinks: selectCkDepositLinks,
};
