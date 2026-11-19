"use client";

import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { CustomerContextMode } from "@/app/realGreen/customer/slices/customerSlices";
import { useDiscount } from "@/app/realGreen/discount/useDiscount";
import { useTaxCode } from "@/app/realGreen/taxCode/useTaxCode";
import { useSalesTaxMapping } from "@/app/salesTax/salesTaxMapping/useSalesTaxMapping";
import { useStateTaxRevenueGroup } from "@/app/salesTax/stateTaxRevenueGroups/useStateTaxRevenueGroup";

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
  // A service's discount is hydrated from the loaded discounts; without them every discount reads 0.
  useDiscount({ autoLoad: true });
  useSalesTaxMapping({ autoLoad: true });
  useStateTaxRevenueGroup({ autoLoad: true });
}
