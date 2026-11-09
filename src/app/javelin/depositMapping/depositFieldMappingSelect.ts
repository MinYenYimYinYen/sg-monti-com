import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { qboAccountSelect } from "@/app/qbo/account/qboAccountSelect";
import { qboCustomerSelect } from "@/app/qbo/customer/qboCustomerSelect";
import { resolveDepositFieldLinks } from "@/app/javelin/depositMapping/depositFieldLinks";

const selectMappingDocs = (state: AppState) => state.depositFieldMapping.mappingDocs;

const selectDepositFieldLinks = createSelector(
  [selectMappingDocs, qboAccountSelect.accountMap, qboCustomerSelect.customerMap],
  (mappingDocs, qboAccountMap, customerMap) =>
    resolveDepositFieldLinks({ mappingDocs, qboAccountMap, customerMap }),
);

export const depositFieldMappingSelect = {
  mappingDocs: selectMappingDocs,
  links: selectDepositFieldLinks,
};
