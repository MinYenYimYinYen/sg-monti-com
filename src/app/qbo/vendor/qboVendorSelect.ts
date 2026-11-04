import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { pickActiveVendors } from "@/app/qbo/vendor/_lib/qboVendorUtils";

const selectVendors = (state: AppState) => state.qboVendor.vendors;

const selectVendorMap = createSelector([selectVendors], (vendors) =>
  new Grouper(vendors).toUniqueMap((v) => v.Id),
);

const selectActiveVendors = createSelector([selectVendors], pickActiveVendors);

export const qboVendorSelect = {
  vendors: selectVendors,
  vendorMap: selectVendorMap,
  activeVendors: selectActiveVendors,
};
