import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";

const selectCustomer = createSelector(
  centralSelect.customers,
  (customers) => customers[0] ?? null,
);

export const quickSendSelect = {
  customer: selectCustomer,
}
