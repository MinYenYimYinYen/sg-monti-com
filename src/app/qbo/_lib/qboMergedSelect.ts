import { createSelector } from "@reduxjs/toolkit";
import { qboVendorSelect } from "@/app/qbo/vendor/qboVendorSelect";
import { qboCustomerSelect } from "@/app/qbo/customer/qboCustomerSelect";
import { qboEmployeeSelect } from "@/app/qbo/employee/qboEmployeeSelect";
import { buildUsedNames } from "@/app/qbo/_lib/qboNameUtils";

// Selectors that span several QBO entities. QuickBooks keeps one set of names across customers,
// vendors and employees, so anything that creates a named entity checks this list first.

const selectUsedNames = createSelector(
  [qboVendorSelect.vendors, qboCustomerSelect.customers, qboEmployeeSelect.employees],
  (vendors, customers, employees) => buildUsedNames({ vendors, customers, employees }),
);

export const qboMergedSelect = {
  usedNames: selectUsedNames,
};
