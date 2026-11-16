import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { isSingleMonthRange } from "@/app/salesTax/_lib/salesTaxDateRange";

const selectDateRange = (state: AppState) => state.salesTaxUI.dateRange;

const selectCanGetCustomers = createSelector([selectDateRange], (dateRange) =>
  isSingleMonthRange(dateRange),
);

export const salesTaxUISelect = {
  dateRange: selectDateRange,
  canGetCustomers: selectCanGetCustomers,
};
