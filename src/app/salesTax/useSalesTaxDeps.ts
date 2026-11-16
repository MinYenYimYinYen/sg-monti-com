"use client";

import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { CustomerContextMode } from "@/app/realGreen/customer/slices/customerSlices";
import { useTaxCode } from "@/app/realGreen/taxCode/useTaxCode";

// Module constant so the contexts array keeps one reference across renders.
const SALES_TAX_CONTEXTS: CustomerContextMode[] = ["salesTaxCustomers"];

/**
 * Everything the sales tax feature reads. Customers are not auto-loaded here: the user picks a
 * month and calls `getCustomers` from `useSalesTaxCustomers`. This only tells the central
 * customer slice to merge from the salesTaxCustomers source slice.
 */
export function useSalesTaxDeps() {
  useCustomerContext({ contexts: SALES_TAX_CONTEXTS });
  useTaxCode({ autoLoad: true });
}
