"use client";

import { useQboAccount } from "@/app/qbo/account/useQboAccount";
import { useQboVendor } from "@/app/qbo/vendor/useQboVendor";
import { useQboCustomer } from "@/app/qbo/customer/useQboCustomer";
import { useQboEmployee } from "@/app/qbo/employee/useQboEmployee";
import { useImportCCTxnMapping } from "@/app/qbo/importCCTxn/useImportCCTxnMapping";
import { useImportRow } from "@/app/qbo/importCCTxn/rows/useImportRow";

/**
 * Which QuickBooks reference loads the caller may make. Absent means allowed. The layout reads the
 * capabilities and passes them in, because hooks expose actions only and do not select.
 */
type CanLoad = {
  qboAccounts?: boolean;
  qboVendors?: boolean;
  qboCustomers?: boolean;
  qboEmployees?: boolean;
  formatAccounts?: boolean;
  cardAssignments?: boolean;
  merchantMappings?: boolean;
  skipRules?: boolean;
  importRows?: boolean;
};

/**
 * Single orchestration point for the data the import pages need. Called once in layout.tsx;
 * panels call these hooks with autoLoad off, only to get their actions.
 *
 * A reference load the user may not make is skipped, so holding part of what these pages use gives
 * no refused request and no error toast. Every hook is still called on every render.
 */
export function useImportCCTxnDeps({ canLoad = {} }: { canLoad?: CanLoad } = {}) {
  const {
    qboAccounts: canLoadQboAccounts = true,
    qboVendors: canLoadQboVendors = true,
    qboCustomers: canLoadQboCustomers = true,
    qboEmployees: canLoadQboEmployees = true,
    formatAccounts: canLoadFormatAccounts = true,
    cardAssignments: canLoadCardAssignments = true,
    merchantMappings: canLoadMerchantMappings = true,
    skipRules: canLoadSkipRules = true,
    importRows: canLoadImportRows = true,
  } = canLoad;
  useQboAccount({ autoLoad: canLoadQboAccounts });
  useQboVendor({ autoLoad: canLoadQboVendors });
  // Customers and employees are loaded only so a new vendor name can be checked against them.
  useQboCustomer({ autoLoad: canLoadQboCustomers });
  useQboEmployee({ autoLoad: canLoadQboEmployees });
  useImportCCTxnMapping({
    autoLoad: true,
    canLoad: {
      formatAccounts: canLoadFormatAccounts,
      cardAssignments: canLoadCardAssignments,
      merchantMappings: canLoadMerchantMappings,
      skipRules: canLoadSkipRules,
    },
  });
  useImportRow({ autoLoad: true, canLoad: canLoadImportRows });
}
