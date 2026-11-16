import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { salesTaxUISelect } from "@/app/salesTax/salesTaxUISelect";
import { revenueByTaxCodeId } from "@/app/salesTax/_lib/revenueByTaxCodeId";
import { TaxSummary } from "@/app/salesTax/salesTaxTypes";

// Built from customerMap, not centralSelect.services: that one applies the global customer-flag
// filter, which must not silently drop services from a tax number.
const selectServices = createSelector([centralSelect.customerMap], (customerMap) =>
  [...customerMap.values()].flatMap((customer) =>
    customer.programs.flatMap((program) => program.services),
  ),
);

const selectRevenueByTaxCodeId = createSelector(
  [selectServices, salesTaxUISelect.dateRange],
  (services, dateRange) =>
    dateRange
      ? revenueByTaxCodeId({ services, dateRange })
      : new Map<string, TaxSummary>(),
);

export const salesTaxSelect = {
  services: selectServices,
  revenueByTaxCodeId: selectRevenueByTaxCodeId,
};
