import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { rgAccountSelect } from "@/app/realGreen/rgAccount/rgAccountSelect";
import { qboAccountSelect } from "@/app/qbo/account/qboAccountSelect";
import {
  buildQboAccountLinks,
  buildRgAccountLinks,
} from "@/app/account/_lib/accountLinks";
import { qboCustomerSelect } from "@/app/qbo/customer/qboCustomerSelect";
import { qboVendorSelect } from "@/app/qbo/vendor/qboVendorSelect";
import {
  buildCustomerOptions,
  buildQboAccountOptions,
  buildVendorOptions,
} from "@/app/account/_lib/accountMappingView";

const selectMappingDocs = (state: AppState) => state.accountMapping.mappingDocs;

const selectRgAccountLinks = createSelector(
  [
    rgAccountSelect.rgAccounts,
    selectMappingDocs,
    qboAccountSelect.accountMap,
    qboCustomerSelect.customerMap,
  ],
  (rgAccounts, mappingDocs, qboAccountMap, customerMap) =>
    buildRgAccountLinks({ rgAccounts, mappingDocs, qboAccountMap, customerMap }),
);

const selectQboAccountLinks = createSelector(
  [qboAccountSelect.accounts, selectRgAccountLinks],
  (qboAccounts, rgAccountLinks) => buildQboAccountLinks({ qboAccounts, rgAccountLinks }),
);

const selectUnmappedRgAccountLinks = createSelector([selectRgAccountLinks], (links) =>
  links.filter((link) => link.status === "unmapped"),
);

const selectQboAccountOptions = createSelector(
  [qboAccountSelect.accounts],
  buildQboAccountOptions,
);

const selectCustomerOptions = createSelector(
  [qboCustomerSelect.customers],
  buildCustomerOptions,
);

const selectVendorOptions = createSelector([qboVendorSelect.vendors], buildVendorOptions);

export const accountSelect = {
  mappingDocs: selectMappingDocs,
  qboAccountOptions: selectQboAccountOptions,
  customerOptions: selectCustomerOptions,
  vendorOptions: selectVendorOptions,
  rgAccountLinks: selectRgAccountLinks,
  qboAccountLinks: selectQboAccountLinks,
  unmappedRgAccountLinks: selectUnmappedRgAccountLinks,
};
