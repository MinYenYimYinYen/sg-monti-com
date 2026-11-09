import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { pickActiveCustomers } from "@/app/qbo/customer/_lib/qboCustomerUtils";

const selectCustomers = (state: AppState) => state.qboCustomer.customers;

const selectCustomerMap = createSelector([selectCustomers], (customers) =>
  new Grouper(customers).toUniqueMap((c) => c.Id),
);

const selectActiveCustomers = createSelector([selectCustomers], pickActiveCustomers);

export const qboCustomerSelect = {
  customers: selectCustomers,
  customerMap: selectCustomerMap,
  activeCustomers: selectActiveCustomers,
};
