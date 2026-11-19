import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { salesTaxMappingSelect } from "@/app/salesTax/salesTaxMapping/salesTaxMappingSelect";
import {
  buildRevenueGroups,
  findUngroupedMnTaxTypes,
} from "@/app/salesTax/stateTaxRevenueGroups/_lib/revenueGroupLogic";

const selectDocs = (state: AppState) => state.stateTaxRevenueGroup.docs;

/** Every group with its members resolved to their Minnesota tax types. */
const selectGroups = createSelector(
  [selectDocs, salesTaxMappingSelect.knownMnTaxTypes],
  (docs, knownMnTaxTypes) => buildRevenueGroups({ docs, knownMnTaxTypes }),
);

const selectGroupByKey = createSelector(
  [selectGroups],
  (groups) => new Map(groups.map((group) => [group.revenueGroupKey, group])),
);

/** Mapped Minnesota tax types that are in no group yet, so they can be put in one. */
const selectUngroupedMnTaxTypes = createSelector(
  [salesTaxMappingSelect.docs, selectDocs],
  (mappingDocs, groupDocs) => findUngroupedMnTaxTypes({ mappingDocs, groupDocs }),
);

export const stateTaxRevenueGroupSelect = {
  docs: selectDocs,
  groups: selectGroups,
  groupByKey: selectGroupByKey,
  ungroupedMnTaxTypes: selectUngroupedMnTaxTypes,
};
